# Kế hoạch triển khai Smart Contract — Verify Certification

> Bổ sung cho [smart-contract-design.md](smart-contract-design.md)
>
> Phạm vi: một trường · Solidity `^0.8.24` · Hardhat · Sepolia
>
> Mục tiêu: chốt **danh sách contract**, thứ tự code, tiêu chí hoàn thành và bàn giao ABI.

---

## 1. Danh sách contract

| # | File | Loại | Deploy? | Trách nhiệm |
|---|---|---|---|---|
| 1 | `contracts/interfaces/ICertificateRegistry.sol` | interface | ❌ | Hợp đồng giao diện cho backend/frontend và tài liệu |
| 2 | `contracts/CertificateRegistry.sol` | contract | ✅ | Toàn bộ logic: issuer, cấp, thu hồi, tra cứu |
| 3 | `contracts/extensions/CertificateSBT.sol` | contract | ❌ P2 | Chứng chỉ dạng Soulbound NFT (mở rộng, không làm v1) |

**Kết luận: v1 chỉ deploy 1 contract.** Interface không deploy, chỉ dùng để tham chiếu.

### Vì sao không tách `IssuerRegistry`?

| Phương án | Ưu | Nhược | Quyết định |
|---|---|---|---|
| Gộp issuer + certificate | 1 địa chỉ, không call chéo, ít gas | Contract dài hơn | ✅ Chọn |
| Tách `IssuerRegistry` | Tách trách nhiệm | 2 lần deploy, 2 địa chỉ, call chéo, phức tạp | ❌ |
| Tách `CertificateVerifier` read-only | Tách view | Không cần; view đã miễn phí | ❌ |

Chỉ tách khi có **nhiều trường** hoặc cần nâng cấp từng phần — ngoài phạm vi đồ án.

---

## 2. Cấu trúc thư mục

```
contracts/
├─ contracts/
│  ├─ CertificateRegistry.sol
│  └─ interfaces/
│     └─ ICertificateRegistry.sol
├─ test/
│  ├─ CertificateRegistry.test.ts
│  └─ helpers.ts
├─ scripts/
│  ├─ deploy.ts
│  ├─ add-issuer.ts
│  └─ read.ts
├─ deployments/
│  └─ sepolia.json          ← sinh ra sau khi deploy
├─ hardhat.config.ts
├─ tsconfig.json
├─ package.json
└─ .env
```

---

## 3. `ICertificateRegistry.sol`

### Nội dung

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICertificateRegistry {
    struct Certificate {
        string  certificateId;
        string  fileHash;
        string  ipfsCid;
        address issuer;
        uint64  issuedAt;
        bool    isRevoked;
    }

    struct Issuer {
        string name;
        bool   active;
        uint64 addedAt;
    }

    event CertificateIssued(
        bytes32 indexed idHash,
        string certificateId,
        string fileHash,
        address indexed issuer,
        uint64 issuedAt
    );
    event CertificateRevoked(bytes32 indexed idHash, address indexed issuer, uint64 revokedAt);
    event IssuerUpdated(address indexed issuer, string name, bool active);

    function addIssuer(address who, string calldata name) external;
    function removeIssuer(address who) external;
    function issueCertificate(
        string calldata certificateId,
        string calldata fileHash,
        string calldata ipfsCid
    ) external;
    function revokeCertificate(string calldata certificateId) external;

    function getCertificate(string calldata certificateId) external view returns (Certificate memory);
    function getIssuer(address who) external view returns (Issuer memory);
    function verifyByHash(string calldata fileHash)
        external view
        returns (bool exists, bool valid, string memory certificateId, address issuer, uint64 issuedAt);
    function isValid(string calldata certificateId) external view returns (bool);
    function totalCertificates() external view returns (uint256);
    function issuedCount(address issuer) external view returns (uint256);
    function owner() external view returns (address);
}
```

> Interface khai báo cả event để backend/frontend lấy ABI đầy đủ khi cần.

### Tiêu chí hoàn thành

- [ ] Không có logic, chỉ signature + struct + event
- [ ] `CertificateRegistry` kế thừa interface
- [ ] Compile không warning

---

## 4. `CertificateRegistry.sol`

### 4.1 Storage layout

```solidity
address public owner;
uint256 public totalCertificates;
mapping(address => uint256) public issuedCount;

mapping(address => Issuer)   private _issuers;
mapping(bytes32 => Certificate) private _certificates;
mapping(bytes32 => bytes32)  private _hashToCert;
```

**Quy ước:**
- `_certificates[key].issuer == address(0)` → chưa tồn tại.
- `key = keccak256(bytes(certificateId))`.
- `_hashToCert[keccak256(bytes(fileHash))] = key`.

### 4.2 Hằng số

```solidity
uint256 public constant MAX_ID_LEN   = 64;
uint256 public constant MAX_HASH_LEN = 80;
uint256 public constant MAX_CID_LEN  = 100;
uint256 public constant MAX_NAME_LEN = 100;
string  public constant VERSION      = "1.0.0";
```

### 4.3 Modifier

```solidity
modifier onlyOwner() {
    if (msg.sender != owner) revert NotOwner();
    _;
}

modifier onlyActiveIssuer() {
    if (!_issuers[msg.sender].active) revert NotIssuer();
    _;
}
```

### 4.4 Hàm quản trị

| Hàm | Logic |
|---|---|
| `constructor()` | `owner = msg.sender; emit OwnershipTransferred(address(0), msg.sender);` |
| `addIssuer(who, name)` | onlyOwner; `who != 0`; tên không rỗng, ≤ 100; nếu đã tồn tại thì cập nhật tên + `active = true`, giữ `addedAt` gốc; nếu mới thì set `addedAt = block.timestamp`; emit |
| `removeIssuer(who)` | onlyOwner; phải tồn tại và đang active; `active = false`; emit |
| `transferOwnership(newOwner)` | onlyOwner; `newOwner != 0`; emit; **P1** |

**Quy tắc:** gỡ issuer không đụng tới chứng chỉ đã cấp.

### 4.5 Hàm cấp chứng chỉ

```solidity
function issueCertificate(
    string calldata certificateId,
    string calldata fileHash,
    string calldata ipfsCid
) external onlyActiveIssuer;
```

**Thứ tự kiểm tra:**

```
1. onlyActiveIssuer (modifier)
2. certificateId không rỗng, ≤ MAX_ID_LEN
3. fileHash không rỗng, ≤ MAX_HASH_LEN
4. ipfsCid không rỗng, ≤ MAX_CID_LEN
5. key chưa tồn tại
6. hashKey chưa được dùng
7. ghi Certificate
8. _hashToCert[hashKey] = key
9. totalCertificates++
10. issuedCount[msg.sender]++
11. emit CertificateIssued
```

**Ghi chú gas:** dùng `bytes(...).length` cho kiểm tra độ dài; không dùng `string.length` (không tồn tại).

### 4.6 Hàm thu hồi

```solidity
function revokeCertificate(string calldata certificateId) external;
```

**Logic:**

```
1. Tìm certificate; nếu issuer == 0 → CertificateNotFound
2. Nếu đã revoked → AlreadyRevoked
3. Nếu msg.sender != cert.issuer && msg.sender != owner → NotIssuer
4. cert.isRevoked = true
5. emit CertificateRevoked
```

**Quyết định:** owner được revoke mọi chứng chỉ (quyền khẩn cấp). Ghi rõ trong báo cáo.

### 4.7 Hàm đọc

| Hàm | Logic | Revert? |
|---|---|---|
| `getCertificate(id)` | trả struct; nếu issuer == 0 → `CertificateNotFound` | ✅ |
| `getIssuer(who)` | trả struct; chưa từng là issuer → struct rỗng | ❌ |
| `verifyByHash(hash)` | tra `_hashToCert`; nếu không có → `exists=false` | ❌ |
| `isValid(id)` | tồn tại && !isRevoked | ❌ |
| `owner()` | getter tự sinh | — |
| `totalCertificates()` | getter | — |
| `issuedCount(address)` | getter | — |

`verifyByHash` trả:

```solidity
returns (
    bool exists,
    bool valid,
    string memory certificateId,
    address issuer,
    uint64 issuedAt
)
```

### 4.8 Event

```solidity
event CertificateIssued(
    bytes32 indexed idHash,
    string certificateId,
    string fileHash,
    address indexed issuer,
    uint64 issuedAt
);

event CertificateRevoked(
    bytes32 indexed idHash,
    address indexed issuer,
    uint64 revokedAt
);

event IssuerUpdated(address indexed issuer, string name, bool active);
event OwnershipTransferred(address indexed from, address indexed to);
```

### 4.9 Custom error

```solidity
error NotOwner();
error NotIssuer();
error IssuerInactive();
error ZeroAddress();
error EmptyField();
error FieldTooLong();
error CertificateExists();
error CertificateNotFound();
error HashAlreadyUsed();
error AlreadyRevoked();
```

### 4.10 Tiêu chí hoàn thành

- [ ] Kế thừa `ICertificateRegistry`
- [ ] Không dùng `require("string")`
- [ ] Không có external call
- [ ] Tất cả hàm có NatSpec ngắn
- [ ] `npx hardhat compile` không lỗi, không warning
- [ ] Ước tính gas `issue` < 400k

---

## 5. Kế hoạch test

### 5.1 Bộ test bắt buộc

| # | Case | Kỳ vọng |
|---|---|---|
| T01 | Constructor | owner = deployer |
| T02 | `addIssuer` bởi owner | active = true, event |
| T03 | `addIssuer` bởi non-owner | revert `NotOwner` |
| T04 | `addIssuer(address(0))` | revert `ZeroAddress` |
| T05 | `addIssuer` tên rỗng | revert `EmptyField` |
| T06 | `addIssuer` tên > 100 bytes | revert `FieldTooLong` |
| T07 | `addIssuer` lần 2 | cập nhật tên, `addedAt` không đổi |
| T08 | `removeIssuer` bởi owner | active = false |
| T09 | `removeIssuer` issuer chưa tồn tại | revert `NotIssuer` |
| T10 | `issueCertificate` bởi issuer active | lưu đúng, event |
| T11 | `issueCertificate` bởi non-issuer | revert `NotIssuer` |
| T12 | `issueCertificate` bởi issuer đã bị gỡ | revert `NotIssuer` |
| T13 | `issueCertificate` id rỗng | revert `EmptyField` |
| T14 | `issueCertificate` id quá dài | revert `FieldTooLong` |
| T15 | `issueCertificate` trùng id | revert `CertificateExists` |
| T16 | `issueCertificate` trùng hash | revert `HashAlreadyUsed` |
| T17 | `getCertificate` không tồn tại | revert `CertificateNotFound` |
| T18 | `verifyByHash` tồn tại | `exists=true`, `valid=true` |
| T19 | `verifyByHash` không tồn tại | `exists=false`, không revert |
| T20 | `revokeCertificate` bởi issuer của cert | `isRevoked=true` |
| T21 | `revokeCertificate` bởi owner | thành công |
| T22 | `revokeCertificate` bởi issuer khác | revert `NotIssuer` |
| T23 | `revokeCertificate` lần 2 | revert `AlreadyRevoked` |
| T24 | `revokeCertificate` id sai | revert `CertificateNotFound` |
| T25 | Gỡ issuer sau khi cấp | cert cũ vẫn `isValid=true` |
| T26 | `isValid` sau revoke | `false` |
| T27 | `totalCertificates` | tăng đúng |
| T28 | `issuedCount` | tăng đúng theo issuer |
| T29 | Event `CertificateIssued` | đúng args |
| T30 | Event `CertificateRevoked` | đúng args |

### 5.2 Test nâng cao (P1)

- [ ] Fuzz độ dài string (Hardhat + fast-check)
- [ ] Gas snapshot cho `issue` và `revoke`
- [ ] Coverage > 95%

### 5.3 Lệnh chạy

```bash
npx hardhat test
npx hardhat coverage
REPORT_GAS=true npx hardhat test
```

---

## 6. Kế hoạch deploy

### 6.0 Chọn công cụ

| Cách | Khi nào | Ghi chú |
|---|---|---|
| **Remix + MetaMask** | Deploy chính thức của đồ án | Không cần private key; xem [remix-deploy-guide.md](remix-deploy-guide.md) |
| Hardhat script | CI, deploy lặp lại, local | Cần `DEPLOYER_PRIVATE_KEY` trong `.env` |

Các script `deploy.ts` / `add-issuer.ts` bên dưới **chỉ dùng khi deploy bằng Hardhat**. Nếu dùng Remix, làm theo hướng dẫn riêng và bỏ qua 6.2–6.3.

### 6.1 Thứ tự

```
1. Deploy CertificateRegistry (không constructor args)
2. Ghi owner = deployer
3. addIssuer(ví trường, "Khoa Công nghệ Thông tin")
4. Verify Etherscan
5. Ghi deployments/sepolia.json
6. Export ABI
7. Cập nhật .env backend + frontend
```

### 6.2 Script `deploy.ts`

```
- Đọc DEPLOYER_PRIVATE_KEY, SEPOLIA_RPC_URL
- Deploy contract
- waitForDeployment()
- Ghi { address, blockNumber, txHash, chainId, deployedAt } vào deployments/sepolia.json
- In ra address + link Etherscan
```

### 6.3 Script `add-issuer.ts`

```
- Đọc địa chỉ contract từ deployments/sepolia.json
- Gọi addIssuer(INITIAL_ISSUER_ADDRESS, "Khoa Công nghệ Thông tin")
- In tx hash
```

### 6.4 Verify Etherscan

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

Nếu plugin dùng API V1 đã deprecated:

- Cấu hình `apiURL: https://api.etherscan.io/v2/api`
- Hoặc verify thủ công trên giao diện Etherscan

### 6.5 Bàn giao

| File | Nội dung |
|---|---|
| `deployments/sepolia.json` | address, block, txHash, chainId |
| `shared/abi/CertificateRegistry.json` | ABI đầy đủ |
| `.env` | `CONTRACT_ADDRESS`, `DEPLOY_BLOCK` |

**Tiêu chí hoàn thành:**

- [ ] Contract verified, link công khai
- [ ] `addIssuer` thành công, đọc lại thấy active
- [ ] Backend đọc được `totalCertificates()`
- [ ] Frontend có ABI + address

---

## 7. Lộ trình 2 ngày

### Ngày 1 — Contract + compile

| Buổi | Việc | Kết quả |
|---|---|---|
| Sáng | Khởi tạo Hardhat, cài deps, cấu hình Sepolia | `npx hardhat compile` chạy |
| Chiều | Viết interface + contract (issuer, issue, revoke, query) | Compile sạch |
| Tối | Viết test T01–T15 | Một nửa test pass |

### Ngày 2 — Test + deploy

| Buổi | Việc | Kết quả |
|---|---|---|
| Sáng | Hoàn tất T16–T30, sửa bug | Toàn bộ test pass |
| Chiều | Deploy Sepolia + addIssuer + verify | Contract live |
| Tối | Export ABI, cập nhật env, viết README contract | Bàn giao xong |

---

## 8. Rủi ro & cách xử lý

| Rủi ro | Ảnh hưởng | Xử lý |
|---|---|---|
| Gas cao do string dài | Tốn ETH test (không đáng kể) | Giới hạn độ dài; theo dõi gas report |
| Verify Etherscan lỗi V1 | Không verify được | Dùng API V2 hoặc verify thủ công |
| Private key lộ | Mất ví test | Không commit; ví riêng; rotate nếu nghi ngờ |
| Deploy sai mạng | Contract vô dụng | Kiểm tra `chainId` trước khi deploy |
| Quên `addIssuer` | Không cấp được chứng chỉ | Script tự động + test đọc lại |
| ABI/address lệch giữa BE/FE | Gọi sai contract | Một file `deployments/sepolia.json` làm nguồn duy nhất |
| Testnet reset | Mất contract | Lưu ảnh Etherscan + ABI làm minh chứng |

---

## 9. Definition of Done

- [ ] `ICertificateRegistry.sol` + `CertificateRegistry.sol` compile sạch
- [ ] 30 test case pass
- [ ] Coverage > 90%
- [ ] Contract verified trên Sepolia Etherscan
- [ ] Issuer đầu tiên đã được thêm on-chain
- [ ] `deployments/sepolia.json` + ABI đã bàn giao
- [ ] `CONTRACT_ADDRESS` và `DEPLOY_BLOCK` đã điền vào env
- [ ] README contract hướng dẫn deploy lại từ đầu

---

## 10. Việc không làm ở v1

- Soulbound NFT
- Proxy upgradeable
- Multi-school registry
- Metadata hash on-chain
- Multisig owner
- Pause khẩn cấp

Các mục này để P2, sau khi demo chạy ổn.
