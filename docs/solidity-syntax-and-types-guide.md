# Hướng dẫn Cú pháp & Kiểu dữ liệu Solidity (Áp dụng cho `CertificateRegistry.sol`)

Tài liệu này giải thích các cú pháp, từ khóa và kiểu dữ liệu Solidity `^0.8.24` được sử dụng trong [CertificateRegistry.sol](../contracts/contracts/CertificateRegistry.sol) và [ICertificateRegistry.sol](../contracts/contracts/interfaces/ICertificateRegistry.sol).

---

## 1. Phần mở đầu file Solidity

```solidity
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;
import {ICertificateRegistry} from "./interfaces/ICertificateRegistry.sol";
```

- **`// SPDX-License-Identifier: GPL-3.0`**: Khai báo giấy phép mã nguồn mở (bắt buộc để trình biên dịch không báo cảnh báo).
- **`pragma solidity ^0.8.24;`**: Chỉ định phiên bản trình biên dịch Solidity từ `0.8.24` đến dưới `0.9.0`. Từ bản `0.8.x`, Solidity tự động kiểm tra tràn số (overflow/underflow).
- **`import {Symbol} from "...";`**: Nhập interface hoặc contract từ file khác.
- **`contract CertificateRegistry is ICertificateRegistry`**: Từ khóa `is` thể hiện kế thừa / tuân thủ interface (tương tự `implements` trong Java/TypeScript).

---

## 2. Kiểu dữ liệu cơ bản (Value Types)

| Kiểu dữ liệu | Ý nghĩa | Ví dụ trong dự án |
|---|---|---|
| `address` | Địa chỉ ví Ethereum hoặc địa chỉ contract (20 bytes = 40 ký tự hex). Giá trị mặc định là `address(0)` (`0x000...000`). | `_owner`, `cert.issuer`, `msg.sender` |
| `uint256` | Số nguyên không dấu 256-bit (`0` đến $2^{256}-1$). | `_totalCertificates`, `MAX_ID_LEN` |
| `uint64` | Số nguyên không dấu 64-bit, dùng tiết kiệm storage khi gói chung với `address`/`bool` trong `struct`. | `issuedAt`, `addedAt` (UNIX timestamp theo giây) |
| `bool` | Giá trị logic `true` hoặc `false` (mặc định `false`). | `active`, `isRevoked`, `isLocked` |
| `bytes32` | Chuỗi byte cố định đúng 32 bytes. Rất rẻ về gas khi làm key cho `mapping` hoặc lưu kết quả băm `keccak256`. | `idKey`, `hashKey`, `idHash` |

---

## 3. Kiểu dữ liệu tham chiếu (Reference Types) & Vị trí lưu trữ (Data Location)

### a) `string` và `bytes`
- **`string`**: Chuỗi UTF-8 có độ dài động. Solidity không hỗ trợ `.length` trực tiếp trên `string`, nên phải ép sang `bytes(str).length` để đếm số byte.
- **`bytes`**: Mảng byte động. Dùng `keccak256(bytes(str))` để băm chuỗi thành `bytes32`.

### b) `struct` (Kiểu cấu trúc)
Gom nhiều trường dữ liệu liên quan thành một đối tượng (khai báo trong `ICertificateRegistry.sol`):
```solidity
struct Certificate {
    string certificateId;
    string fileHash;
    string ipfsCid;
    address issuer;
    uint64 issuedAt;
    bool isRevoked;
    bool isLocked;
}
```

### c) `mapping(KeyType => ValueType)`
Bảng băm (key-value) lưu on-chain với tốc độ truy xuất $O(1)$:
- `mapping(address => Issuer) private _issuers;`
- `mapping(bytes32 => Certificate) private _certificates;`
- **Lưu ý quan trọng**: `mapping` không thể lặp (`for`), không có `.length`, và mọi key chưa từng gán đều tự trả về giá trị mặc định (`0`, `false`, `address(0)`, chuỗi rỗng `""`). Vì vậy để kiểm tra một chứng chỉ có tồn tại hay không, contract kiểm tra `cert.issuer != address(0)`.

### d) 3 vùng lưu trữ dữ liệu: `storage`, `memory`, `calldata`

| Từ khóa | Nơi lưu | Đặc điểm | Dùng khi nào |
|---|---|---|---|
| `storage` | Trên blockchain (vĩnh viễn) | Đọc/ghi tốn gas; sửa biến `storage` sẽ làm thay đổi dữ liệu thật on-chain. | Biến trạng thái của contract hoặc con trỏ tới phần tử trong `mapping` (VD: `Certificate storage cert = _certificates[idKey];`). |
| `memory` | RAM tạm thời khi chạy hàm | Tồn tại trong lúc hàm thực thi rồi xoá; sửa không ảnh hưởng blockchain. | Biến cục bộ, hoặc giá trị trả về từ hàm `view` (VD: `returns (Certificate memory)`). |
| `calldata` | Dữ liệu đầu vào của giao dịch | Chỉ đọc (không sửa được), **rẻ gas nhất** vì không phải copy sang `memory`. | Tham số chuỗi/mảng của hàm `external` (VD: `string calldata certificateId`). |

---

## 4. Biến toàn cục (Global Variables) hay dùng

- **`msg.sender`**: Địa chỉ ví (hoặc contract) đang trực tiếp gọi hàm hiện tại.
- **`block.timestamp`**: Thời gian của khối (block) hiện tại tính bằng giây UNIX.

---

## 5. Khả năng truy cập & Tính chất hàm (Visibility & Mutability)

### Visibility (Phạm vi gọi)
- **`external`**: Chỉ gọi được từ bên ngoài contract (Frontend, Backend, ví MetaMask, contract khác).
- **`public`**: Gọi được cả từ bên trong lẫn bên ngoài. Với biến `public constant`, Solidity tự tạo hàm getter (VD: `VERSION()`).
- **`private`**: Chỉ các hàm bên trong chính contract đó mới gọi được (VD: `_requireNonEmptyWithin`).

### State Mutability (Tác động lên trạng thái blockchain)
- **(Không ghi gì)**: Hàm thay đổi dữ liệu trên blockchain (cần gửi transaction, tốn gas, phải chờ MetaMask ký).
- **`view`**: Chỉ **đọc** dữ liệu từ `storage`, không sửa gì. Khi gọi đọc từ ngoài (RPC) thì **miễn phí gas**.
- **`pure`**: Không đọc và cũng không sửa `storage`, chỉ tính toán trên tham số truyền vào (VD: `_requireNonEmptyWithin`).

### Từ khóa bổ sung
- **`constant`**: Hằng số cố định lúc compile, nhúng thẳng vào bytecode (không tốn slot storage).
- **`override`**: Đánh dấu hàm này cài đặt lại hàm đã khai báo trong `ICertificateRegistry`.

---

## 6. Cơ chế kiểm soát & Nhật ký trong Contract

### a) `error` & `revert` (Custom Error)
```solidity
error NotOwner();
if (msg.sender != _owner) revert NotOwner();
```
Khi điều kiện sai, lệnh `revert` sẽ **dừng ngay lập tức** và **hoàn tác (rollback)** toàn bộ thay đổi trong giao dịch đó. Dùng `error` tùy chỉnh tốn ít gas hơn nhiều so với `require(..., "chuỗi thông báo dài")`.

### b) `modifier`
Đoạn code kiểm tra dùng chung, gắn vào đầu hàm (VD: `onlyOwner`, `onlyActiveIssuer`). Ký hiệu `_;` là vị trí thân hàm được chèn vào sau khi điều kiện trong `modifier` đã qua.

### c) `event`, `emit` và `indexed`
```solidity
event CertificateIssued(
    bytes32 indexed idHash,
    string certificateId,
    string fileHash,
    address indexed issuer,
    uint64 issuedAt
);
```
- **`emit`**: Ghi nhật ký sự kiện vào transaction receipt trên Ethereum (rẻ hơn rất nhiều so với lưu vào `storage`).
- **`indexed`**: Cho phép lọc/tìm kiếm nhanh log theo trường đó (tối đa 3 tham số `indexed` trong 1 event). Backend ([chain.service.ts](../backend/src/services/chain.service.ts) và [sync.service.ts](../backend/src/services/sync.service.ts)) đọc các event này bằng ABI để xác minh và đồng bộ về MongoDB.
