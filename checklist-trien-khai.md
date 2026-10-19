# Checklist triển khai — Verify Certification (Ethereum Sepolia)

> Đồ án môn học · 4 module: Smart Contract · Database · Backend · Frontend
>
> **Cách dùng:** `P0` = bắt buộc để demo được · `P1` = nên có để ăn điểm · `P2` = mở rộng nếu còn thời gian.
> Mã ID (SC-01, BE-03…) dùng thống nhất trong commit message, báo cáo và slide.

---

## 0. Chuẩn bị môi trường (PRE)

- [ ] **PRE-01** — Tạo ví MetaMask **mới**, chỉ dùng cho đồ án; lưu seed phrase offline.
- [ ] **PRE-02** — Thêm mạng Sepolia (Chain ID `11155111`), xin 0.05–0.1 SepoliaETH từ faucet.
- [ ] **PRE-03** — Tạo tài khoản Alchemy hoặc Infura, lấy Sepolia RPC URL. `P0`
- [ ] **PRE-04** — Tạo tài khoản Pinata, lấy JWT và gateway URL. `P0`
- [ ] **PRE-05** — Tạo MongoDB Atlas cluster M0, user DB, connection string. `P0`
- [ ] **PRE-06** — Tạo tài khoản Vercel (frontend) và Render (backend). `P1`
- [ ] **PRE-07** — Lấy Etherscan API key cho Sepolia (verify contract). `P0`
- [ ] **PRE-08** — Khởi tạo repo Git, cấu trúc `contracts/ backend/ frontend/`, thêm `.gitignore` cho `.env`, `node_modules`, `artifacts`, `.next`. `P0`
- [ ] **PRE-09** — Cài Node 20 LTS + pnpm (hoặc npm), Git, VS Code. `P0`
- [ ] **PRE-10** — Lập bảng biến môi trường cho cả 3 phần, thống nhất tên biến. `P0`
- [ ] **PRE-11** — Tạo file `.env.example` cho từng module (không chứa giá trị thật). `P0`

**Done khi:** `npx hardhat --version` chạy được, ví có SepoliaETH, 4 tài khoản cloud đã tạo.

---

## 1. Smart Contract (SC)

### 1.1 Khởi tạo dự án

- [ ] **SC-01** — `npx hardhat init` (TypeScript), cài `@nomicfoundation/hardhat-toolbox`, `dotenv`. `P0`
- [ ] **SC-02** — Cấu hình `hardhat.config.ts`: mạng `sepolia`, RPC từ env, Etherscan API key. `P0`
- [ ] **SC-03** — Tạo `contracts/CertificateRegistry.sol`, khai báo `pragma solidity ^0.8.24`. `P0`
- [ ] **SC-04** — Tạo `scripts/deploy.ts`, sau khi deploy ghi địa chỉ ra `deployments/sepolia.json`. `P0`

### 1.2 Thiết kế dữ liệu

- [ ] **SC-05** — `struct Certificate { certificateId, fileHash, ipfsCid, issuer, issuedAt, isRevoked }`. `P0`
- [ ] **SC-06** — `mapping(bytes32 => Certificate) certificates` với key `keccak256(bytes(certificateId))`. `P0`
- [ ] **SC-07** — `mapping(bytes32 => bytes32) hashToCertId` để tra cứu ngược từ fileHash. `P0`
- [ ] **SC-08** — `mapping(address => bool) isIssuer` + `address owner`. `P0`
- [ ] **SC-09** — Thống nhất định dạng hash: `sha256:<hex lowercase>` (khớp frontend/backend). `P0`
- [ ] **SC-10** — Thêm `uint256 public totalCertificates` và `mapping(address => uint256) issuedByIssuer` (thống kê). `P1`

### 1.3 Chức năng

- [ ] **SC-11** — `addIssuer(address)` / `removeIssuer(address)`, `onlyOwner`. `P0`
- [ ] **SC-12** — `issueCertificate(string id, string fileHash, string cid)`, `onlyIssuer`. `P0`
- [ ] **SC-13** — `revokeCertificate(string id)`: chỉ issuer của cert hoặc owner. `P0`
- [ ] **SC-14** — `getCertificate(string id)` trả đầy đủ struct; revert `CertificateNotFound` nếu không có. `P0`
- [ ] **SC-15** — `verifyByHash(string fileHash)` trả `(bool exists, string id, address issuer, uint64 issuedAt, bool revoked)`. `P0`
- [ ] **SC-16** — `isValid(string id)` trả `exists && !isRevoked`. `P1`
- [ ] **SC-17** — Event `CertificateIssued(bytes32 indexed idHash, string id, string fileHash, address indexed issuer, uint64 issuedAt)`. `P0`
- [ ] **SC-18** — Event `CertificateRevoked(bytes32 indexed idHash, address indexed issuer, uint64 revokedAt)`. `P0`
- [ ] **SC-19** — Event `IssuerUpdated(address indexed issuer, bool active)`. `P1`

### 1.4 Kiểm tra dữ liệu & lỗi

- [ ] **SC-20** — Revert nếu `certificateId` rỗng hoặc đã tồn tại. `P0`
- [ ] **SC-21** — Revert nếu `fileHash` rỗng hoặc đã được dùng. `P0`
- [ ] **SC-22** — Revert nếu issuer không active. `P0`
- [ ] **SC-23** — Revert nếu revoke cert đã revoke (`AlreadyRevoked`). `P0`
- [ ] **SC-24** — Dùng custom error thay vì `require` string để tiết kiệm gas. `P1`
- [ ] **SC-25** — Không lưu PII (tên, MSSV, điểm, ảnh) on-chain. `P0`

### 1.5 Test

- [ ] **SC-26** — Test happy path: add issuer → issue → get → verify → revoke. `P0`
- [ ] **SC-27** — Test revert: issue trùng ID, trùng hash, issuer lạ, revoke 2 lần. `P0`
- [ ] **SC-28** — Test phân quyền: non-owner không addIssuer được; issuer A không revoke cert của B. `P0`
- [ ] **SC-29** — Test `verifyByHash` với hash không tồn tại → `exists = false`. `P0`
- [ ] **SC-30** — Chạy `npx hardhat coverage`, mục tiêu > 90% cho contract chính. `P1`
- [ ] **SC-31** — Chạy `hardhat-gas-reporter`, ghi lại gas `issue`/`revoke` cho báo cáo. `P2`

### 1.6 Deploy & verify

- [ ] **SC-32** — Deploy lên Sepolia bằng `npx hardhat run scripts/deploy.ts --network sepolia`. `P0`
- [ ] **SC-33** — Verify source trên Etherscan Sepolia (`hardhat verify`). `P0`
- [ ] **SC-34** — Lưu lại: contract address, deploy tx hash, block number, link Etherscan. `P0`
- [ ] **SC-35** — Add issuer (ví nhà trường demo) bằng script hoặc Remix. `P0`
- [ ] **SC-36** — Ghi `deploymentBlock` để backend backfill event từ đúng block. `P1`

### 1.7 Bàn giao

- [ ] **SC-37** — Export ABI ra `shared/abi/CertificateRegistry.json`. `P0`
- [ ] **SC-38** — Ghi địa chỉ contract vào `.env.example` của backend và frontend. `P0`
- [ ] **SC-39** — Viết `contracts/README.md`: cách build, test, deploy, verify. `P1`

**Done khi:** contract verified trên Sepolia, toàn bộ test pass, ABI + address đã bàn giao cho BE/FE.

---

## 2. Database (DB)

### 2.1 Hạ tầng

- [ ] **DB-01** — Tạo cluster M0, database `verify_cert`, user có quyền readWrite. `P0`
- [ ] **DB-02** — Cấu hình Network Access (demo: `0.0.0.0/0`, ghi chú rủi ro trong báo cáo). `P0`
- [ ] **DB-03** — Kết nối bằng MongoDB Compass để kiểm tra. `P1`
- [ ] **DB-04** — Cài Mongoose ở backend, tạo `connectDB()` có retry + log trạng thái. `P0`

### 2.2 Schema

- [ ] **DB-05** — Collection `users`: email, passwordHash, role (`admin|issuer|viewer`), walletAddress, displayName, isActive, timestamps. `P0`
- [ ] **DB-06** — Collection `issuers`: name, walletAddress, userId, logoUrl, website, isActive, timestamps. `P0`
- [ ] **DB-07** — Collection `certificates`: certificateId, fileHash, ipfsCid, issuerWallet, issuerId, studentName, studentCode, major, graduationYear, gpa, issuedAt, txHash, blockNumber, status (`active|revoked`), revokedAt, revokeTxHash, timestamps. `P0`
- [ ] **DB-08** — Collection `chain_events`: txHash, logIndex, blockNumber, eventType, payload, processedAt — chống xử lý trùng. `P0`
- [ ] **DB-09** — Collection `sync_state`: key, lastSyncedBlock, updatedAt. `P1`
- [ ] **DB-10** — Collection `audit_logs`: actorId, action, targetId, metadata, createdAt. `P1`
- [ ] **DB-11** — Không lưu file PDF/base64 trong DB; chỉ lưu CID + metadata text. `P0`

### 2.3 Index & ràng buộc

- [ ] **DB-12** — Unique index `certificates.certificateId`. `P0`
- [ ] **DB-13** — Unique index `certificates.fileHash`. `P0`
- [ ] **DB-14** — Index `certificates.issuerWallet`, `certificates.studentCode`, `certificates.status`. `P0`
- [ ] **DB-15** — Index `users.email` unique, `users.walletAddress` unique sparse. `P0`
- [ ] **DB-16** — Index `chain_events.txHash + logIndex` unique. `P0`
- [ ] **DB-17** — Text index cho `studentName`, `major` (phục vụ search). `P1`
- [ ] **DB-18** — Schema validation: enum status, required fields, trim lowercase cho địa chỉ ví và hash. `P0`

### 2.4 Dữ liệu & vận hành

- [ ] **DB-19** — Script `seed.ts`: tạo admin, 1 issuer demo, gắn walletAddress. `P0`
- [ ] **DB-20** — Không seed certificate giả — certificate phải được issue thật trên chain. `P0`
- [ ] **DB-21** — Script `reset.ts` xóa dữ liệu demo (chỉ chạy ở dev). `P1`
- [ ] **DB-22** — Export JSON toàn bộ collection trước khi bảo vệ (backup). `P1`
- [ ] **DB-23** — Kiểm tra dung lượng < 512MB, xóa log cũ nếu cần. `P2`
- [ ] **DB-24** — Vẽ ERD/schema diagram cho báo cáo. `P1`

**Done khi:** connect được từ backend, indexes đã tạo, seed chạy được, không có dữ liệu nhạy cảm trong repo.

---

## 3. Backend (BE)

### 3.1 Khung dự án

- [ ] **BE-01** — Khởi tạo Express + TypeScript, cấu trúc `src/{routes,controllers,services,models,middlewares,utils}`. `P0`
- [ ] **BE-02** — Cài: `express`, `mongoose`, `cors`, `helmet`, `morgan`, `zod`, `jsonwebtoken`, `bcryptjs`, `multer`, `axios`, `ethers`, `dotenv`. `P0`
- [ ] **BE-03** — Validate env bằng zod khi khởi động, fail fast nếu thiếu biến. `P1`
- [ ] **BE-04** — Chuẩn hóa response: `{ success, data, error, meta }`. `P0`
- [ ] **BE-05** — Middleware xử lý lỗi tập trung + `asyncHandler`. `P0`
- [ ] **BE-06** — Logging có requestId, không log secret/private key. `P1`
- [ ] **BE-07** — Endpoint `GET /api/health` trả trạng thái DB + RPC + block number. `P1`

### 3.2 Auth & phân quyền

- [ ] **BE-08** — `POST /api/auth/login` (email + password) → JWT. `P0`
- [ ] **BE-09** — Hash password bằng bcrypt (cost 10–12). `P0`
- [ ] **BE-10** — Middleware `requireAuth`, `requireRole('admin'|'issuer')`. `P0`
- [ ] **BE-11** — `GET /api/auth/me` trả user + role + wallet. `P0`
- [ ] **BE-12** — `POST /api/auth/wallet/nonce` + `POST /api/auth/wallet/verify` (SIWE) — đăng nhập bằng chữ ký ví. `P1`
- [ ] **BE-13** — `POST /api/issuers` (admin) tạo issuer + gán wallet. `P0`
- [ ] **BE-14** — `GET /api/issuers` danh sách issuer đang active. `P1`
- [ ] **BE-15** — Rate limit login (5 lần/phút/IP). `P0`

### 3.3 Upload & IPFS

- [ ] **BE-16** — `POST /api/uploads` nhận multipart (PDF/JPG/PNG ≤ 5MB). `P0`
- [ ] **BE-17** — Kiểm tra MIME + magic bytes, không tin `Content-Type` từ client. `P0`
- [ ] **BE-18** — Backend tự tính `sha256` của file, **so khớp** với hash client gửi lên. `P0`
- [ ] **BE-19** — Upload Pinata qua `pinFileToIPFS`, trả `{ cid, fileHash, size }`. `P0`
- [ ] **BE-20** — Không bao giờ trả `PINATA_JWT` ra response/log. `P0`
- [ ] **BE-21** — Endpoint `GET /api/ipfs/:cid` proxy gateway (tránh CORS, ẩn gateway). `P1`
- [ ] **BE-22** — Giới hạn số file & dung lượng mỗi issuer/ngày. `P2`

### 3.4 API chứng chỉ

- [ ] **BE-23** — `POST /api/certificates` lưu metadata **sau khi** tx đã confirmed. `P0`
- [ ] **BE-24** — Trước khi lưu: verify `receipt.status = 1`, đúng contract address, event chứa đúng `certificateId` + `fileHash` + `issuer`. `P0`
- [ ] **BE-25** — Chặn ghi DB nếu `txHash` đã tồn tại (idempotent). `P0`
- [ ] **BE-26** — `GET /api/certificates/:id` trả metadata + trạng thái on-chain + link Etherscan/IPFS. `P0`
- [ ] **BE-27** — `GET /api/certificates?q=&status=&issuer=&page=&limit=` tìm kiếm + phân trang. `P0`
- [ ] **BE-28** — `POST /api/certificates/:id/revoke` ghi nhận txHash revoke sau khi confirmed. `P0`
- [ ] **BE-29** — `GET /api/certificates/stats` tổng cấp/thu hồi/theo issuer. `P1`
- [ ] **BE-30** — Validate toàn bộ input bằng zod (độ dài, định dạng hash, địa chỉ ví). `P0`

### 3.5 Verify & đồng bộ chain

- [ ] **BE-31** — `GET /api/verify/:id` đọc trực tiếp contract, trả trạng thái chuẩn. `P0`
- [ ] **BE-32** — `GET /api/verify?hash=` tra theo fileHash. `P0`
- [ ] **BE-33** — Trả về `source: "chain"` để frontend biết dữ liệu không phải cache. `P1`
- [ ] **BE-34** — Listener `contract.on('CertificateIssued')` + `CertificateRevoked`. `P0`
- [ ] **BE-35** — Backfill event từ `deploymentBlock` bằng `queryFilter` theo chunk 5.000 block. `P1`
- [ ] **BE-36** — Lưu `chain_events` trước khi upsert certificate (chống trùng khi restart). `P0`
- [ ] **BE-37** — Cron định kỳ đối soát DB ↔ chain, log các lệch. `P2`
- [ ] **BE-38** — Xử lý RPC lỗi/timeout: retry có backoff, không crash process. `P1`

### 3.6 Bảo mật & chất lượng

- [ ] **BE-39** — `helmet`, CORS whitelist đúng origin frontend. `P0`
- [ ] **BE-40** — Giới hạn body size, timeout request. `P0`
- [ ] **BE-41** — Không trả stack trace ở production. `P0`
- [ ] **BE-42** — `.env` không commit; `.env.example` đầy đủ key. `P0`
- [ ] **BE-43** — Test API bằng Jest + Supertest: login, upload sai MIME, verify not found, phân quyền. `P1`
- [ ] **BE-44** — Script `npm run build` + `start` chạy production ổn. `P0`

### 3.7 Deploy

- [ ] **BE-45** — Deploy Render (Web Service), set toàn bộ env vars. `P1`
- [ ] **BE-46** — Cấu hình CORS cho domain Vercel thật. `P1`
- [ ] **BE-47** — Warm-up endpoint để giảm cold start trước demo. `P1`
- [ ] **BE-48** — Ghi lại base URL production vào README. `P0`

**Done khi:** Postman/Thunder Client chạy được toàn bộ luồng: login → upload → lưu cert → verify → revoke → verify lại.

---

## 4. Frontend (FE)

### 4.1 Khung dự án

- [ ] **FE-01** — `create-next-app` (App Router, TypeScript, Tailwind, ESLint). `P0`
- [ ] **FE-02** — Cài `ethers@6`, `react-hot-toast` (hoặc sonner), `lucide-react`, `qrcode.react`. `P0`
- [ ] **FE-03** — Tạo `lib/api.ts` (fetch wrapper, gắn JWT, xử lý lỗi). `P0`
- [ ] **FE-04** — Tạo `lib/contract.ts` (address, ABI, provider, signer). `P0`
- [ ] **FE-05** — Tạo `lib/hash.ts` (`sha256File()` bằng Web Crypto, format `sha256:<hex>`). `P0`
- [ ] **FE-06** — Tạo `lib/format.ts` (ngày giờ, địa chỉ rút gọn, link Etherscan/IPFS). `P1`
- [ ] **FE-07** — Layout chung: header, footer, font, màu, dark mode (tùy chọn). `P1`

### 4.2 Wallet & mạng

- [ ] **FE-08** — `ConnectWallet` component: detect MetaMask, connect, hiển thị địa chỉ rút gọn. `P0`
- [ ] **FE-09** — `NetworkGuard`: kiểm tra chainId `11155111`, sai thì hiện nút "Switch to Sepolia". `P0`
- [ ] **FE-10** — Xử lý `wallet_switchEthereumChain` + `wallet_addEthereumChain` nếu chưa có mạng. `P0`
- [ ] **FE-11** — Lắng nghe `accountsChanged`, `chainChanged` → reload state. `P0`
- [ ] **FE-12** — Hiển thị trạng thái: chưa cài MetaMask / chưa connect / sai mạng / sẵn sàng. `P0`
- [ ] **FE-13** — Hook `useWallet()` gom toàn bộ logic ví. `P0`

### 4.3 Trang Issuer

- [ ] **FE-14** — `/login` — form đăng nhập, lưu JWT (httpOnly cookie hoặc localStorage demo). `P0`
- [ ] **FE-15** — `/issuer` — dashboard: thống kê + bảng chứng chỉ đã cấp. `P0`
- [ ] **FE-16** — `/issuer/issue` — form: mã cert, tên SV, MSSV, ngành, năm, GPA + upload PDF. `P0`
- [ ] **FE-17** — Hiển thị hash tính được ngay khi chọn file (preview trước khi ký). `P0`
- [ ] **FE-18** — Nút "Cấp chứng chỉ": upload → gọi contract → chờ receipt → lưu metadata. `P0`
- [ ] **FE-19** — `TxStatus`: pending / success / rejected / reverted, kèm link Etherscan. `P0`
- [ ] **FE-20** — Chặn submit nếu sai mạng, thiếu file, hoặc hash trùng. `P0`
- [ ] **FE-21** — `/issuer/certificates/[id]` — chi tiết, nút Revoke có confirm 2 bước. `P0`
- [ ] **FE-22** — Sau revoke: cập nhật UI ngay, hiện link tx revoke. `P0`
- [ ] **FE-23** — `/admin/issuers` — thêm/gỡ issuer (chỉ role admin). `P1`

### 4.4 Trang Verifier (công khai)

- [ ] **FE-24** — `/verify` — ô nhập mã cert + vùng kéo-thả file. `P0`
- [ ] **FE-25** — Tra theo mã: gọi API/contract, hiển thị kết quả. `P0`
- [ ] **FE-26** — Tra theo file: tính hash client-side → `verifyByHash`. `P0`
- [ ] **FE-27** — Kết quả 3 trạng thái rõ ràng: ✅ Hợp lệ · ❌ Đã thu hồi · ⚠️ Không tìm thấy. `P0`
- [ ] **FE-28** — Trang `/certificate/[id]` công khai: thông tin, issuer, ngày cấp, link tx, link IPFS. `P0`
- [ ] **FE-29** — Hiển thị "nguồn: blockchain" + block number để tăng tin cậy. `P1`
- [ ] **FE-30** — So sánh hash file tải từ IPFS với hash on-chain (nút "Kiểm tra file gốc"). `P1`
- [ ] **FE-31** — QR code trỏ tới trang verify của cert. `P2`
- [ ] **FE-32** — Trang `/` landing: giới thiệu vấn đề, giải pháp, nút Verify / Issuer login. `P1`

### 4.5 UX & trạng thái

- [ ] **FE-33** — Loading skeleton, empty state, error state cho mọi trang. `P1`
- [ ] **FE-34** — Map lỗi ví: `4001` (user rejected), insufficient funds, revert reason → message tiếng Việt. `P0`
- [ ] **FE-35** — Responsive mobile cho trang verify (quan trọng khi demo). `P1`
- [ ] **FE-36** — Không hiển thị địa chỉ ví đầy đủ ở nơi không cần; có nút copy. `P2`
- [ ] **FE-37** — Kiểm tra accessibility cơ bản: label, contrast, keyboard. `P2`

### 4.6 Deploy

- [ ] **FE-38** — Build production không lỗi TypeScript/ESLint. `P0`
- [ ] **FE-39** — Deploy Vercel, set env `NEXT_PUBLIC_*`. `P1`
- [ ] **FE-40** — Kiểm tra lại toàn bộ luồng trên domain thật. `P1`
- [ ] **FE-41** — Ghi URL production + tài khoản demo vào README. `P0`

**Done khi:** issuer cấp được chứng chỉ thật; verifier tra cứu đúng 3 trạng thái; sai mạng được chặn rõ ràng.

---

## 5. Tích hợp & kiểm thử E2E (IT)

- [ ] **IT-01** — Chạy full luồng local: Hardhat node → backend → frontend. `P0`
- [ ] **IT-02** — Chạy full luồng Sepolia: issue → verify → revoke → verify. `P0`
- [ ] **IT-03** — Test file giả mạo (sửa 1 byte PDF) → phải báo không tìm thấy. `P0`
- [ ] **IT-04** — Test cấp trùng mã cert → contract revert, UI báo lỗi đúng. `P0`
- [ ] **IT-05** — Test issuer A revoke cert của issuer B → bị chặn. `P0`
- [ ] **IT-06** — Test mất mạng giữa lúc ký tx → UI không treo, có retry. `P1`
- [ ] **IT-07** — Test backend restart → listener/backfill không tạo dữ liệu trùng. `P1`
- [ ] **IT-08** — Test trên trình duyệt khác (Chrome/Edge) và mobile. `P1`
- [ ] **IT-09** — Viết checklist demo và chạy thử 2 lần trước ngày bảo vệ. `P0`

---

## 6. Tài liệu & bảo vệ (DOC)

- [ ] **DOC-01** — README gốc: kiến trúc, sơ đồ, công nghệ, cách chạy, địa chỉ contract. `P0`
- [ ] **DOC-02** — Sơ đồ tuần tự cho luồng issue và verify (Mermaid). `P1`
- [ ] **DOC-03** — Bảng so sánh: DB tập trung vs blockchain (bất biến, tin cậy, chi phí). `P1`
- [ ] **DOC-04** — Ghi rõ giới hạn: testnet, không có giá trị pháp lý, dữ liệu demo. `P0`
- [ ] **DOC-05** — Slide 10–12 trang: vấn đề → giải pháp → kiến trúc → demo → kết luận. `P0`
- [ ] **DOC-06** — Video demo dự phòng 3–5 phút (phòng khi mạng lỗi). `P0`
- [ ] **DOC-07** — Ảnh chụp Etherscan (contract + tx issue + tx revoke) làm phụ lục. `P1`
- [ ] **DOC-08** — Bảng phân công công việc & đóng góp (nếu làm nhóm). `P1`
- [ ] **DOC-09** — Dọn dẹp repo: xóa file nháp, `.env`, `node_modules`, artifacts nặng. `P0`

---

## 7. Thứ tự thực hiện & phụ thuộc

```
PRE ──► SC (contract + test + deploy) ──► ABI/address
  │                                          │
  ├──► DB (schema + seed) ───────────────────┤
  │                                          ▼
  └──────────────────────────────► BE (API + sync) ──► FE (issuer + verifier) ──► IT ──► DOC
```

**Thứ tự bắt buộc:**
1. `PRE` → `SC-01…SC-31` (contract chạy local).
2. `SC-32…SC-38` (deploy + ABI) **trước** khi backend/frontend tích hợp.
3. `DB-01…DB-19` song song với SC.
4. `BE` làm trước `FE` phần verify; FE issuer có thể làm song song sau khi có ABI.
5. `IT` sau khi FE xong luồng chính; `DOC` chạy song song từ tuần 4.

### Mốc thời gian 4 tuần (bản rút gọn)

| Tuần | Trọng tâm | Mốc kiểm tra |
|---|---|---|
| 1 | PRE + SC + DB schema | Contract verified trên Sepolia |
| 2 | BE auth + upload + API cert | Postman chạy được issue/verify |
| 3 | FE issuer + verifier | Cấp & tra cứu được trên Sepolia |
| 4 | IT + deploy + DOC | Demo end-to-end + video dự phòng |

### Nếu thiếu thời gian — cắt theo thứ tự này
1. Bỏ `P2` toàn bộ.
2. Bỏ admin UI (`FE-23`), dùng script/Remix để add issuer.
3. Bỏ SIWE (`BE-12`), dùng email/password.
4. Bỏ backfill (`BE-35`), chỉ dùng listener.
5. **Không bao giờ cắt:** `SC-11…SC-18`, `BE-23/24`, `FE-08/09/18/24/27`, `IT-03`.

---

## 8. Definition of Done toàn dự án

- [ ] Contract verified công khai trên Sepolia Etherscan, có địa chỉ trong README.
- [ ] Cấp chứng chỉ thật → thấy event trên Etherscan.
- [ ] File gốc truy xuất được từ IPFS qua CID.
- [ ] Tra cứu đúng: hợp lệ / đã thu hồi / không tồn tại.
- [ ] Sửa file → hash đổi → verify thất bại.
- [ ] Revoke → trạng thái đổi ngay, lịch sử vẫn còn on-chain.
- [ ] Sai mạng / chưa cài ví → UI chặn và hướng dẫn rõ.
- [ ] Không có secret, private key, JWT trong repo.
- [ ] Backend từ chối lưu metadata nếu tx không hợp lệ.
- [ ] README chạy lại được từ đầu bởi người khác.
- [ ] Có video demo dự phòng và slide bảo vệ.

---

## 9. Ngoài phạm vi (để tránh trượt tiến độ)

- Mainnet hoặc tiền thật.
- Xác thực danh tính/KYC, chữ ký số hợp pháp.
- Multi-chain, Layer 2.
- App mobile native.
- Thanh toán, tokenomics.
- Tích hợp hệ thống đào tạo thật của trường.
- Chống gian lận cấp bằng ở cấp tổ chức (chỉ demo cơ chế).
