# Kế hoạch xây dựng Demo "Verify Certification" trên Ethereum Sepolia

> Đồ án môn học · Ngân sách 0đ · Thời gian gợi ý 5–6 tuần

---

## 1. SepoliaETH là gì?

| Câu hỏi | Trả lời ngắn |
|---|---|
| Sepolia là gì? | Một **testnet (mạng thử nghiệm)** của Ethereum, chạy Proof-of-Stake, dùng để deploy và test smart contract trước khi lên mainnet. |
| SepoliaETH là gì? | Token dùng để trả **gas** trên Sepolia. Không có giá trị tiền thật, không bán được, chỉ xin từ faucet. |
| Chain ID | `11155111` (hex: `0xaa36a7`) |
| Block explorer | https://sepolia.etherscan.io |
| Có deploy được không? | **Có.** Đây là môi trường chuẩn để demo đồ án blockchain. Hợp đồng và giao dịch vẫn công khai, bất biến, kiểm chứng được trên Etherscan — chỉ khác là không tốn tiền. |
| Có phải mainnet không? | Không. Mainnet là `1`. Sepolia chỉ là bản sao để thử nghiệm; testnet có thể bị reset hoặc ngừng hỗ trợ trong tương lai, nên **không dùng cho sản phẩm thật**. |

**Kết luận:** Với đồ án môn học, deploy lên Sepolia là lựa chọn đúng: miễn phí, có bằng chứng on-chain để trình bày, không cần mua ETH thật.

### Cách lấy SepoliaETH (free)
1. Cài MetaMask → tạo ví mới **chỉ dùng cho đồ án**.
2. Thêm mạng Sepolia (MetaMask thường có sẵn; nếu không: RPC `https://rpc.sepolia.org`, Chain ID `11155111`).
3. Xin test ETH từ 1 trong các faucet:
   - https://cloud.google.com/application/web3/faucet/ethereum/sepolia
   - https://www.alchemy.com/faucets/ethereum-sepolia
   - https://faucet.quicknode.com/ethereum/sepolia
   - https://sepolia-faucet.pk910.de (đào PoW, không cần tài khoản)
4. Chỉ cần **0.05–0.1 SepoliaETH** là đủ cho hàng trăm giao dịch. Mỗi lần cấp chứng chỉ tốn khoảng 100k–250k gas; với gas 1–10 gwei thì gần như không đáng kể.

> Lưu ý: Faucet giới hạn theo IP/ví. Nếu bị từ chối, thử faucet khác hoặc chờ 24h.

---

## 2. Kiến trúc tổng thể

```
┌──────────────────────┐        ┌──────────────────────┐
│  Nhà trường (Issuer) │        │ Nhà tuyển dụng (Verifier)
│  MetaMask + Next.js  │        │  Next.js (public page)
└──────────┬───────────┘        └──────────┬───────────┘
           │ ký tx (client-side)            │ đọc dữ liệu
           ▼                                ▼
┌────────────────────────────────────────────────────────┐
│           Smart Contract trên Ethereum Sepolia          │
│  certificateId · fileHash · ipfsCid · issuer · issuedAt │
│  · isRevoked · events · issuer whitelist                │
└───────────▲───────────────────────────┬────────────────┘
            │ ghi metadata / sync        │ đọc on-chain
┌───────────┴───────────┐        ┌───────▼────────────────┐
│ Backend Node/Express  │        │  IPFS (Pinata)          │
│ + MongoDB Atlas       │        │  file PDF/ảnh gốc       │
│ auth, search, cache   │        │  trả về CID             │
└───────────────────────┘        └─────────────────────────┘
```

**Nguyên tắc quan trọng:**
- **Blockchain là nguồn sự thật** cho `fileHash` và `isRevoked`.
- Backend **không giữ private key** của nhà trường; giao dịch do MetaMask ký phía client.
- Backend chỉ lưu metadata phục vụ tìm kiếm/hiển thị (tên, ngành, điểm), không lưu bản sao chứng chỉ.
- File gốc nằm trên IPFS; on-chain chỉ lưu **hash** và **CID** → không đưa dữ liệu cá nhân lên chain.

---

## 3. Thành phần & công nghệ (gói free)

| Thành phần | Công nghệ khuyên dùng | Vai trò | Giới hạn free |
|---|---|---|---|
| Smart Contract | Solidity `^0.8.24` + **Hardhat** (hoặc Remix để thử nhanh) | Lưu `certificateId`, `fileHash`, `ipfsCid`, `issuer`, `issuedAt`, `isRevoked`; event; whitelist issuer | Miễn phí |
| Mạng | **Ethereum Sepolia** | Môi trường deploy/test | Gas free |
| Lưu file | **Pinata (IPFS)** | Lưu PDF/ảnh gốc, trả CID | ~1 GB |
| Backend | **Node.js + Express** (TypeScript) | API auth, search, upload proxy, sync event | — |
| Database | **MongoDB Atlas M0** | users, certificates metadata, audit log | 512 MB |
| Frontend | **Next.js 14 (App Router) + Tailwind** | Trang issuer + trang tra cứu công khai | — |
| Web3 | **ethers v6** + **MetaMask** | Ký tx, đọc contract, xác thực hash | — |
| RPC | **Alchemy** hoặc **Infura** free | Provider đọc/ghi chain, nghe event | 300M CU/tháng |
| Deploy FE | **Vercel Hobby** | Hosting Next.js | 100 GB bandwidth |
| Deploy BE | **Render Free** (hoặc Railway/Fly.io) | Hosting API | 750h/tháng, ngủ sau 15 phút |
| Verify contract | **Etherscan Sepolia API** | Public source code, minh bạch | Free |

> Tổng chi phí: **0đ**. Chỉ cần thời gian và một ví MetaMask.

---

## 4. Thiết kế Smart Contract

### 4.1 Dữ liệu

```solidity
struct Certificate {
    string  certificateId; // mã chứng chỉ, VD: "UIT-2024-CS-0001"
    string  fileHash;      // "sha256:<hex>" của file PDF gốc
    string  ipfsCid;       // CID trên IPFS
    address issuer;        // ví nhà trường đã ký
    uint64  issuedAt;      // unix timestamp
    bool    isRevoked;
}
```

- `mapping(bytes32 => Certificate)` với key = `keccak256(bytes(certificateId))`.
- `mapping(bytes32 => bytes32)` ánh xạ `fileHash → certificateId` để tra cứu ngược khi nhà tuyển dụng chỉ có file.
- `mapping(address => bool) isIssuer` + `onlyIssuer` modifier.
- `owner` (admin) thêm/gỡ issuer; issuer chỉ được thu hồi chứng chỉ do chính mình cấp.

### 4.2 Hàm chính

| Hàm | Quyền | Mô tả |
|---|---|---|
| `addIssuer(address)` / `removeIssuer(address)` | owner | Quản lý danh sách nhà trường |
| `issueCertificate(id, fileHash, cid)` | issuer | Cấp mới; revert nếu trùng id/hash |
| `revokeCertificate(id)` | issuer của cert | Thu hồi; không xóa dữ liệu, chỉ đổi cờ |
| `getCertificate(id)` | anyone | Trả toàn bộ struct |
| `verifyByHash(fileHash)` | anyone | Trả `(valid, id, issuer, issuedAt)` |
| `isValid(id)` | anyone | `exists && !isRevoked` |

### 4.3 Event

```solidity
event CertificateIssued(bytes32 indexed idHash, string certificateId, string fileHash, address indexed issuer, uint64 issuedAt);
event CertificateRevoked(bytes32 indexed idHash, address indexed issuer, uint64 revokedAt);
event IssuerUpdated(address indexed issuer, bool active);
```

Event giúp backend sync mà không phải quét toàn bộ state.

### 4.4 Lưu ý thiết kế
- **Không** lưu tên, MSSV, điểm, ảnh trên chain (tốn gas + lộ dữ liệu cá nhân).
- Hash nên là **SHA-256** (dễ tính bằng Web Crypto API) hoặc keccak256; thống nhất một chuẩn và ghi rõ tiền tố.
- Dùng `string` cho demo dễ đọc; nếu muốn tối ưu gas có thể dùng `bytes32` cho hash.
- Có thể mở rộng: cấp chứng chỉ dưới dạng **Soulbound NFT (ERC-721 không transfer)** để tăng điểm kỹ thuật — nhưng không bắt buộc.

---

## 5. Luồng nghiệp vụ

### 5.1 Cấp chứng chỉ (Issuer)
1. Nhà trường đăng nhập (ví + SIWE hoặc email/password demo).
2. Upload PDF → frontend tính `sha256(file)`.
3. Upload PDF lên Pinata (qua backend proxy) → nhận `cid`.
4. Gọi `issueCertificate(id, hash, cid)` bằng MetaMask → tx hash.
5. Chờ 1–2 confirmation → backend lưu metadata (tên SV, ngành, điểm) vào MongoDB.
6. Hiển thị link Etherscan + link IPFS.

### 5.2 Tra cứu (Verifier)
1. Nhập mã chứng chỉ **hoặc** kéo-thả file PDF.
2. Nếu là file: tính hash → gọi `verifyByHash(hash)`.
3. Contract trả `issuer`, `issuedAt`, `isRevoked`.
4. Frontend hiển thị: ✅ Hợp lệ / ❌ Đã thu hồi / ⚠️ Không tìm thấy.
5. So sánh CID tải từ IPFS với CID on-chain (tùy chọn nâng cao): hash file tải về phải khớp `fileHash`.

### 5.3 Thu hồi
1. Issuer gọi `revokeCertificate(id)`.
2. Event `CertificateRevoked` → backend cập nhật cache.
3. Trang tra cứu hiển thị trạng thái "Đã thu hồi" ngay lập tức (đọc trực tiếp chain, không phụ thuộc cache).

---

## 6. Cấu trúc thư mục đề xuất

```
verify-certification/
├─ contracts/
│  ├─ contracts/CertificateRegistry.sol
│  ├─ scripts/deploy.ts
│  ├─ test/CertificateRegistry.test.ts
│  └─ hardhat.config.ts
├─ backend/
│  ├─ src/index.ts
│  ├─ src/routes/{auth,certificates,upload}.ts
│  ├─ src/services/{pinata,chain,db}.ts
│  └─ src/models/*.ts
├─ frontend/
│  ├─ app/(issuer)/issue/page.tsx
│  ├─ app/verify/page.tsx
│  ├─ app/certificates/[id]/page.tsx
│  ├─ components/{ConnectWallet,UploadDropzone,CertificateCard}.tsx
│  └─ lib/{contract.ts,ipfs.ts,hash.ts}
└─ README.md
```

---

## 7. Lộ trình 6 tuần

| Tuần | Việc cần làm | Kết quả |
|---|---|---|
| **1** | Cài MetaMask, lấy SepoliaETH, tạo tài khoản Alchemy/Pinata/Atlas/Vercel. Viết contract + test trên Hardhat local. | Contract chạy pass test local |
| **2** | Deploy Sepolia, verify Etherscan. Viết script upload Pinata. | Contract address + ABI + link Etherscan |
| **3** | Backend: auth, CRUD metadata, upload proxy, API verify, sync event. | API chạy local, Postman test được |
| **4** | Frontend issuer: connect wallet, form cấp chứng chỉ, upload, ký tx. | Cấp được chứng chỉ thật trên Sepolia |
| **5** | Frontend verifier: tra cứu theo ID/file, hiển thị trạng thái, trang chi tiết. | Demo end-to-end |
| **6** | Deploy Vercel + Render, viết README, quay video demo, chuẩn bị slide bảo vệ. | Sản phẩm hoàn chỉnh |

**Milestone tối thiểu nếu hết thời gian:** contract + Remix + trang verify tĩnh là đã đủ demo core.

---

## 8. Kịch bản demo trước giảng viên (5–7 phút)

1. **Mở Etherscan Sepolia** — giới thiệu contract đã verify, chain ID 11155111.
2. **Cấp chứng chỉ** cho SV A: upload PDF → MetaMask ký → tx success.
3. **Mở Etherscan tx** — cho thấy dữ liệu on-chain: hash, CID, issuer, timestamp.
4. **Mở IPFS gateway** — tải đúng file PDF gốc.
5. **Tra cứu hợp lệ** — nhập mã hoặc upload PDF → ✅.
6. **Giả mạo** — sửa 1 ký tự trong PDF → hash đổi → ❌ không tìm thấy.
7. **Thu hồi** — issuer revoke → tra cứu lại → ❌ đã thu hồi, nhưng lịch sử vẫn còn trên chain.
8. **Nhấn mạnh:** không tốn phí, không cần server trung tâm tin cậy, dữ liệu bất biến.

---

## 9. Rủi ro & cách xử lý

| Rủi ro | Ảnh hưởng | Cách xử lý |
|---|---|---|
| Faucet không cho ETH | Không deploy được | Thử nhiều faucet; nhờ bạn bè chuyển 0.02 SepoliaETH; dùng Hardhat local để phát triển trước |
| Render free ngủ 15 phút | API chậm lần đầu (~30–60s) | Gọi warm-up trước khi demo; hoặc dùng Vercel serverless cho API nhẹ |
| Pinata free 1GB | Hết dung lượng | Chỉ upload file demo nhỏ; nén PDF; xóa file cũ |
| MongoDB Atlas 512MB | Đầy | Chỉ lưu metadata text, không lưu file/base64 |
| Lộ Pinata JWT | Người khác upload | Chỉ để trong backend env, không bao giờ đưa vào `NEXT_PUBLIC_*` |
| Lộ private key | Mất ví | Chỉ dùng ví test; không commit `.env`; thêm `.gitignore` |
| Testnet bị reset/ngừng | Mất contract | Chấp nhận với đồ án; lưu ABI + địa chỉ + ảnh chụp Etherscan làm minh chứng |
| Gas estimate fail | Tx lỗi | Test kỹ trên local; đặt `gasLimit` thủ công; tránh lưu string dài |
| Xung đột phiên bản ethers | Code không chạy | Khóa `ethers@6`, dùng đúng API `BrowserProvider` / `Contract` |

---

## 10. Biến môi trường

**contracts/.env**
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<KEY>
PRIVATE_KEY=<ví deploy test>
ETHERSCAN_API_KEY=<key>
```

**backend/.env**
```
PORT=4000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
PINATA_JWT=...
SEPOLIA_RPC_URL=...
CONTRACT_ADDRESS=0x...
FRONTEND_ORIGIN=http://localhost:3000
```

**frontend/.env.local**
```
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

---

## 11. Checklist trước khi bảo vệ

- [ ] Contract verify công khai trên Sepolia Etherscan
- [ ] README có sơ đồ kiến trúc, địa chỉ contract, hướng dẫn chạy
- [ ] Video demo dự phòng (phòng khi mạng/web lỗi)
- [ ] Test case: cấp trùng ID, revoke bởi ví không phải issuer, verify file sai
- [ ] Phân quyền rõ: owner / issuer / verifier
- [ ] Không có private key hay JWT trong repo
- [ ] Slide nêu bật: bất biến, minh bạch, phi tập trung, chi phí 0
- [ ] So sánh ngắn với giải pháp truyền thống (DB tập trung) để thấy giá trị blockchain

---

## 12. Mở rộng ăn điểm (nếu còn thời gian)

- **Soulbound NFT** đại diện chứng chỉ, ví sinh viên giữ.
- **QR code** trên bằng tốt nghiệp in giấy → mở trang verify.
- **Multi-sig** cho việc thu hồi (2/3 admin).
- **The Graph** hoặc indexer để tra cứu nhanh hơn.
- **SIWE (Sign-In with Ethereum)** thay cho mật khẩu.
- **Trang quản trị** thống kê số chứng chỉ đã cấp/thu hồi.

---

## 13. Tài liệu tham khảo

- Ethereum Sepolia: https://ethereum.org/en/developers/docs/networks/#sepolia
- Hardhat: https://hardhat.org/docs
- ethers v6: https://docs.ethers.org/v6/
- Pinata: https://docs.pinata.cloud/
- MongoDB Atlas: https://www.mongodb.com/docs/atlas/
- Vercel: https://vercel.com/docs
- EIP-721 (nếu làm SBT): https://eips.ethereum.org/EIPS/eip-721
