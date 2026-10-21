# Raccoon University — Cổng Tra Cứu & Xác Thực Văn Bằng (Frontend)

Hệ thống giao diện Web3 hiện đại phục vụ quản lý, phát hành và xác thực văn bằng chứng chỉ đại học minh bạch, chống làm giả dựa trên nền tảng **Ethereum Sepolia Blockchain** và mạng lưu trữ phi tập trung **IPFS**.

---

## 1. Công nghệ & Kiến trúc (Tech Stack)

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/) với React 19 & TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) với bảng màu học thuật cao cấp (*Parchment `#FAF4DF`, Warm Gold `#E6AB42`, Navy `#010E1C`, Cream `#FFFDF7`*)
- **Typography**: Google Fonts (*Be Vietnam Pro* cho giao diện văn bản, *Playfair Display* cho tiêu đề văn bằng)
- **Web3 & Blockchain**: [ethers v6](https://docs.ethers.org/) kết nối MetaMask trên mạng Ethereum Sepolia (`Chain ID: 11155111 / 0xaa36a7`)
- **State Management**: [TanStack React Query v5](https://tanstack.com/query/latest) với cơ chế cache và làm mới tự động
- **Forms & Validation**: React Hook Form, Zod
- **Mã hóa Client-side**: Web Crypto API chuẩn trình duyệt tính toán mã băm SHA-256 của file PDF mà không cần tải file lên server

---

## 2. Yêu cầu tiên quyết (Prerequisites)

- **Node.js**: Phiên bản 18.18.0 trở lên (khuyên dùng Node 20 LTS)
- **Trình duyệt**: Hỗ trợ Web3 Extension (MetaMask, Rabby hoặc Coinbase Wallet)
- **Tài khoản ví Web3**:
  - Đã thêm mạng **Ethereum Sepolia Testnet**
  - Có một lượng nhỏ SepoliaETH để ký giao dịch (faucet miễn phí qua [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) hoặc [Alchemy Faucet](https://sepoliafaucet.com/))

---

## 3. Cài đặt & Cấu hình môi trường (Getting Started)

### Bước 1: Cài đặt dependencies

```bash
cd frontend
npm install
```

### Bước 2: Thiết lập biến môi trường

Sao chép file `.env.example` thành `.env.local`:

```bash
cp .env.example .env.local
```

Mở file `.env.local` và điền thông tin môi trường thực tế:

```env
# Mạng Ethereum Sepolia
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CHAIN_ID_HEX=0xaa36a7
NEXT_PUBLIC_CHAIN_NAME=Sepolia
NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_EXPLORER_URL=https://sepolia.etherscan.io

# Smart Contract đã triển khai trên Sepolia
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_DEPLOY_BLOCK=11953245

# Backend API
NEXT_PUBLIC_API_URL=https://vc-api-a3i5.onrender.com

# IPFS Gateway công khai
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

> **Lưu ý bảo mật**: Tất cả biến môi trường được dùng trong frontend đều phải có tiền tố `NEXT_PUBLIC_*`. Tuyệt đối **không** cấu hình các biến bảo mật như `PINATA_JWT`, `MONGODB_URI`, hoặc `JWT_SECRET` trong thư mục `frontend/`.

---

## 4. Các lệnh thực thi (Commands)

| Lệnh | Mục đích |
| :--- | :--- |
| `npm run dev` | Chạy máy chủ phát triển cục bộ tại `http://localhost:3000` |
| `npm run lint` | Kiểm tra toàn bộ mã nguồn bằng ESLint (đảm bảo 0 lỗi và 0 cảnh báo) |
| `npm run build` | Biên dịch bản build tối ưu hóa cho Production |
| `npm run start` | Khởi chạy server production sau khi build |

---

## 5. Cấu trúc chức năng (Key Modules)

### 5.1 Cổng Tra cứu Công khai (Public Portal)
- **Trang chủ (`/`)**: Hero tìm kiếm nhanh, giải thích quy trình 3 bước, danh sách văn bằng mới phát hành.
- **Tra cứu văn bằng (`/search`)**:
  - Tìm kiếm thời gian thực theo Mã bằng, Tên sinh viên, MSSV (debounce 400ms).
  - Bộ lọc kết hợp: Năm tốt nghiệp, Ngành đào tạo, Loại văn bằng, Trạng thái on-chain.
  - Đồng bộ 2 chiều với URL query params (giữ nguyên kết quả khi F5 / chia sẻ link).
- **Xác thực văn bằng (`/verify`)**:
  - *Xác thực bằng file*: Kéo thả file PDF văn bằng gốc, tự động băm SHA-256 ngay trên trình duyệt và đối chiếu với Smart Contract.
  - *Xác thực theo mã*: Nhập mã định danh để tra cứu trạng thái tức thì.
- **Chi tiết hồ sơ văn bằng (`/c/[id]`)**:
  - Trình bày định dạng bằng tốt nghiệp đại học truyền thống sang trọng (Academic Diploma).
  - Mã QR động trỏ trực tiếp đến link xác thực văn bằng.
  - Khối Blockchain Provenance: Hiển thị TxHash (liên kết Etherscan), Block Number, IPFS CID, nút tải bản PDF gốc.
  - Banner cảnh báo nổi bật màu đỏ nếu văn bằng đã bị thu hồi on-chain.

### 5.2 Phân hệ Đơn vị Đào tạo (Issuer Portal)
- **Đăng nhập (`/login`)**: Xác thực JWT qua API backend, lưu token và tự động điều hướng theo quyền.
- **Bảng điều khiển (`/issuer`)**: Thống kê số văn bằng đã cấp, phân loại theo trạng thái (Hợp lệ vs Đã thu hồi).
- **Quy trình Cấp văn bằng 4 bước (`/issuer/issue`)**:
  1. *Bước 1 — Nhập liệu*: Form động theo loại chứng chỉ (Cử nhân, Khóa học, Tín chỉ, Chứng nhận khác).
  2. *Bước 2 — Xem trước & Chuẩn bị*: Gọi `POST /api/certificates/prepare` sinh PDF và băm SHA-256 trên IPFS.
  3. *Bước 3 — Ký số On-chain*: Kích hoạt MetaMask gọi hàm Smart Contract `issueCertificate(certificateId, fileHash, ipfsCid)`.
  4. *Bước 4 — Xác nhận hoàn tất*: Gọi `POST /api/certificates/confirm` đồng bộ với backend. Hỗ trợ nút "Thử lưu lại" nếu đường truyền chập chờn sau khi giao dịch blockchain đã hoàn tất.
- **Chi tiết & Thu hồi văn bằng (`/issuer/certificates/[id]`)**:
  - Xem thông tin chi tiết.
  - Nút "Thu hồi văn bằng" mở Modal an toàn yêu cầu gõ lại chính xác mã văn bằng để xác nhận trước khi kích hoạt giao dịch `revokeCertificate` trên MetaMask.

### 5.3 Phân hệ Quản trị Hệ thống (Admin Portal)
- **Trung tâm Thống kê (`/admin`)**: Thống kê thời gian thực tổng số văn bằng, tỷ lệ hợp lệ, số lượng đơn vị đào tạo, tài khoản và biểu đồ theo loại bằng.
- **Quản lý Đơn vị cấp (`/admin/issuers`)**:
  - Danh sách đơn vị, địa chỉ ví ủy quyền và trạng thái kích hoạt on-chain.
  - Modal thêm đơn vị cấp mới: Ví Admin ký gọi hàm `addIssuer(issuerAddress, name)` trên Smart Contract và lưu vào hệ thống qua `POST /api/issuers`.
- **Quản lý văn bằng hệ thống (`/admin/certificates`)**:
  - Tra cứu và xem toàn bộ chứng chỉ phát hành bởi tất cả các đơn vị.
  - Quyền thu hồi khẩn cấp dành cho ví Owner/Admin của hợp đồng.

---

## 6. Hướng dẫn Triển khai Vercel (Deployment)

1. Đăng nhập vào [Vercel Dashboard](https://vercel.com/) và chọn **Add New Project**.
2. Kết nối tới Git repository và chọn thư mục gốc (Root Directory) là `frontend`.
3. Framework Preset: **Next.js**.
4. Cấu hình các biến môi trường trong phần **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_CONTRACT_ADDRESS`
   - `NEXT_PUBLIC_CHAIN_ID`
   - `NEXT_PUBLIC_CHAIN_ID_HEX`
   - `NEXT_PUBLIC_CHAIN_NAME`
   - `NEXT_PUBLIC_RPC_URL`
   - `NEXT_PUBLIC_EXPLORER_URL`
   - `NEXT_PUBLIC_IPFS_GATEWAY`
5. Nhấn **Deploy**.
6. Sau khi deploy thành công, cập nhật biến môi trường trên Render Backend:
   ```env
   FRONTEND_ORIGIN=https://<your-vercel-domain>.vercel.app
   ```
7. Redeploy backend để cấu hình CORS và đường dẫn mã QR trên các chứng chỉ mới cấp trỏ chính xác về domain Vercel.

---

## 7. Tiêu chuẩn Thiết kế & Trải nghiệm Người dùng (UX & Polish)

- **Mobile First**: Đáp ứng mượt mà trên tất cả kích thước màn hình từ 375px (iPhone SE) đến 4K Desktop.
- **Cơ chế phòng ngừa lỗi**:
  - Tự động kiểm tra mạng Sepolia và hiển thị nút "Đổi sang Sepolia" qua MetaMask.
  - Cảnh báo ví kết nối không khớp với tài khoản đăng nhập.
  - Client Error Boundary (`error.tsx`, `global-error.tsx`) thân thiện bằng tiếng Việt, ẩn stack trace nhạy cảm.
  - Trang 404 tùy chỉnh (`not-found.tsx`) sang trọng, dẫn hướng thuận tiện.
