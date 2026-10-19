# Kế hoạch Frontend — Verify Certification

> Next.js 14+ (App Router) · TypeScript · Tailwind · ethers v6 · MetaMask · Vercel
>
> Mục tiêu: giao diện cho **nhà trường cấp phát** và **công chúng tra cứu**, chạy được trên desktop lẫn mobile.

---

## 1. Phạm vi & người dùng

| Vai trò | Cần đăng nhập? | Màn hình chính |
|---|---|---|
| Khách / Nhà tuyển dụng | ❌ | `/`, `/verify`, `/search`, `/c/[id]` |
| Issuer (khoa) | ✅ | `/issuer`, `/issuer/issue`, `/issuer/certificates/[id]` |
| Admin (phòng đào tạo) | ✅ | `/admin/issuers` (P1) |

Không có giao diện cho sinh viên ở v1 — sinh viên nhận link + PDF.

---

## 2. Sitemap

```
/                       Landing
/verify                 Tra cứu: theo mã hoặc theo file
/search                 Danh sách chứng chỉ + bộ lọc
/c/[certificateId]      Trang công khai của một chứng chỉ (link in trong PDF)
/login                  Đăng nhập issuer/admin

/issuer                 Dashboard
/issuer/issue           Form cấp chứng chỉ
/issuer/certificates/[id]  Chi tiết + thu hồi

/admin/issuers          Quản lý đơn vị cấp (P1)
```

---

## 3. Cấu trúc thư mục

```
frontend/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx
│  ├─ globals.css
│  ├─ verify/page.tsx
│  ├─ search/page.tsx
│  ├─ c/[id]/page.tsx
│  ├─ login/page.tsx
│  ├─ issuer/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  ├─ issue/page.tsx
│  │  └─ certificates/[id]/page.tsx
│  └─ admin/issuers/page.tsx
├─ components/
│  ├─ layout/        Header, Footer, Container
│  ├─ wallet/        ConnectButton, NetworkGuard, WalletBadge
│  ├─ certificate/   CertificateCard, StatusBadge, CertificateTable, PdfButton
│  ├─ verify/        VerifyTabs, FileDropzone, VerifyResult
│  ├─ search/        SearchHero, SearchBar, SearchFilters, ResultTable
│  ├─ forms/         IssueForm, LoginForm, IssuerForm
│  ├─ ui/            Button, Input, Select, Modal, Toast, Skeleton, EmptyState
│  └─ tx/            TxStatus, TxLink
├─ hooks/
│  ├─ useWallet.ts
│  ├─ useAuth.ts
│  ├─ useCertificate.ts
│  ├─ useCertificates.ts
│  ├─ useIssue.ts
│  └─ useDebounce.ts
├─ lib/
│  ├─ api.ts
│  ├─ contract.ts
│  ├─ abi/CertificateRegistry.json
│  ├─ hash.ts
│  ├─ format.ts
│  ├─ validation.ts
│  └─ constants.ts
├─ types/
│  └─ certificate.ts
├─ public/
│  ├─ logo.svg
│  └─ seal.svg
└─ .env.local
```

---

## 4. Thư viện

| Thư viện | Bắt buộc | Mục đích |
|---|---|---|
| `next` | ✅ | Framework |
| `typescript` | ✅ | Type safety |
| `tailwindcss` | ✅ | Styling |
| `ethers@6` | ✅ | Contract, provider, signer |
| `react-hook-form` + `zod` | ✅ | Form + validation |
| `@tanstack/react-query` | 🟡 P1 | Cache, pagination, refetch |
| `react-hot-toast` | ✅ | Thông báo |
| `lucide-react` | ✅ | Icon |
| `qrcode.react` | 🟡 P1 | QR trên trang chứng chỉ |
| `clsx` / `tailwind-merge` | ✅ | Ghép class |

Không dùng UI kit nặng (MUI, Ant) — Tailwind + component tự viết đủ cho đồ án.

---

## 5. Thiết kế giao diện

### 5.1 Ngôn ngữ & phong cách

**Hướng thiết kế: “Academic Heritage”** — cảm giác văn bằng giấy, con dấu sáp, mực navy và nhũ vàng.

- Toàn bộ tiếng Việt.
- Font UI: **Be Vietnam Pro** (hỗ trợ dấu tốt).
- Font tiêu đề / văn bằng: **Playfair Display** (serif, có subset tiếng Việt).
- Font hash/mã: **JetBrains Mono**.
- Không gradient rực rỡ, không glassmorphism. Dùng nền kem, viền mảnh, khoảng thở rộng.
- Chi tiết nhận diện: con dấu vàng, đường kẻ đôi, hoa văn góc văn bằng.

### 5.2 Token màu

| Token | Hex | Dùng cho | Ghi chú tương phản |
|---|---|---|---|
| `primary` | `#010E1C` | Chữ chính, header, nền nút chính | 17.6:1 trên nền kem — AAA |
| `secondary` | `#E6AB42` | Con dấu, CTA phụ, focus ring, badge hợp lệ | 9.5:1 trên primary — AAA |
| `background` | `#FAF4DF` | Nền trang | |
| `surface` | `#FFFDF7` | Nền card (sáng hơn nền một chút) | |
| `neutral` | `#A48B73` | Viền, divider, icon phụ | **Không dùng làm chữ** (2.9:1 trên kem) |
| `accent` | `#E6606A` | Thu hồi, lỗi, hành động nguy hiểm | 3.05:1 trên kem — chỉ dùng chữ lớn/icon |
| `accent-strong` | `#B23F4A` | Chữ lỗi nhỏ, viền badge thu hồi | 5.15:1 trên kem — AA |
| `muted` | `#6F5C4A` | Chữ phụ, mô tả | 5.77:1 trên kem — AA |
| `border` | `#E3D5B8` | Viền card, input | |

```css
:root {
  --color-primary: #010E1C;
  --color-secondary: #E6AB42;
  --color-bg: #FAF4DF;
  --color-surface: #FFFDF7;
  --color-neutral: #A48B73;
  --color-accent: #E6606A;
  --color-accent-strong: #B23F4A;
  --color-muted: #6F5C4A;
  --color-border: #E3D5B8;
}
```

**Quy tắc sử dụng:**

- Nền trang luôn là `background`, card là `surface`.
- Chữ body dùng `primary`, chữ phụ dùng `muted`.
- `neutral` chỉ làm đường kẻ/viền — không làm chữ.
- `accent` chỉ cho badge lớn hoặc icon; chữ nhỏ dùng `accent-strong`.
- Vàng `secondary` là **màu của con dấu và điểm nhấn**, không dùng làm nền chữ dài.

### 5.3 Trạng thái chứng chỉ

Không dùng xanh lá — giữ bảng màu thuần. “Hợp lệ” thể hiện bằng navy + vàng, giống con dấu chính thức.

| Trạng thái | Nền | Chữ / icon | Ghi chú |
|---|---|---|---|
| **Hợp lệ** | `primary` | `secondary` | Check vàng trên nền navy |
| **Đã thu hồi** | `accent/12%` | `accent-strong` | Viền `accent`, icon X |
| **Không tìm thấy** | `neutral/15%` | `muted` | Icon dấu hỏi |
| **Đang kiểm tra** | trong suốt | `muted` | Spinner vàng |

---

## 6. Đặc tả từng trang

### 6.1 `/` — Landing

| Khối | Nội dung |
|---|---|
| Hero | “Xác thực chứng chỉ bằng blockchain” + **thanh tìm kiếm lớn** ngay giữa trang |
| Search bar | Placeholder: “Nhập MSSV, họ tên hoặc mã chứng chỉ…” → Enter chuyển `/search?q=...` |
| CTA phụ | “Tra cứu bằng file PDF” → `/verify`; “Đăng nhập nhà trường” → `/login` |
| Cách hoạt động | 3 bước: cấp → lưu IPFS → tra cứu on-chain |
| Số liệu | Tổng chứng chỉ đã cấp |
| **Widget** | **“Chứng chỉ cấp gần đây”** — 6 chứng chỉ mới nhất, có nhãn xác thực on-chain |
| Footer | Trường, năm, link Etherscan contract |

#### 6.1.1 Widget “Chứng chỉ cấp gần đây”

Đặt ngay dưới ô search ở landing và ở State A của `/search`.

```
┌──────────────────────────────────────────────────────┐
│ Chứng chỉ cấp gần đây              [Xem tất cả →]    │
├──────────────────────────────────────────────────────┤
│ 2311***  Nguyễn V. A.   CNTT 2026   2 phút trước  ✅ │
│ 2311***  Trần T. B.     KTPM 2026   1 giờ trước   ✅ │
│ 2210***  Lê V. C.       CNTT 2025   3 giờ trước   ❌ │
└──────────────────────────────────────────────────────┘
```

**Nguồn dữ liệu — quan trọng:**

| Cách | Nên dùng? | Lý do |
|---|---|---|
| Gọi `queryFilter` trực tiếp mỗi lần tải trang | ❌ | Chậm, giới hạn block range, không có tên SV |
| Backend index từ event rồi trả API | ✅ | Nhanh, có metadata, vẫn truy vết được `txHash` |

Widget **không đọc chain trực tiếp**, mà đọc từ backend — backend đã đồng bộ event on-chain. Mỗi item kèm `txHash` + block number để chứng minh nguồn gốc.

**Endpoint:**

```
GET /api/public/certificates/recent?limit=6
```

**Response:**

```json
{
  "data": [
    {
      "certificateId": "UIT-2024-CS-0001",
      "studentNameMasked": "Nguyễn V. A.",
      "studentCodeMasked": "2311***",
      "major": "Kỹ thuật phần mềm",
      "graduationYear": 2026,
      "issuedAt": "2026-10-19T08:00:00.000Z",
      "status": "active",
      "txHash": "0xabc...",
      "blockNumber": 11948000
    }
  ]
}
```

**Quy tắc hiển thị:**

- **Che tên/MSSV** trong widget (`Nguyễn V. A.`, `2311***`) — đây là hiển thị thụ động, không nên phơi toàn bộ danh sách.
- Trang `/search` khi người dùng chủ động tìm thì trả đầy đủ.
- Thời gian tương đối: “2 phút trước”, “1 giờ trước”; quá 7 ngày hiện ngày.
- Badge trạng thái: hợp lệ / đã thu hồi.
- Click item → `/c/[id]`.
- “Xem tất cả” → `/search?sort=newest`.

**Cập nhật:**

- `refetchInterval: 30_000` (React Query), không cần WebSocket.
- Server cache `Cache-Control: public, max-age=30, stale-while-revalidate=60`.
- Item mới trong 24h có chấm vàng nhỏ.

**Trạng thái:**

| Trạng thái | UI |
|---|---|
| Đang tải | Skeleton 3 dòng |
| Rỗng | “Chưa có chứng chỉ nào được cấp” |
| Lỗi | Ẩn widget, không làm hỏng landing |

**Vì sao không hiển thị toàn bộ tên?**

Widget xuất hiện với mọi khách truy cập, không cần thiết phơi tên đầy đủ. Tra cứu chủ động ở `/search` mới cần. Đây là cân bằng giữa minh bạch và riêng tư.

### 6.2 `/verify` — Tra cứu

Hai tab:

**Tab “Theo mã”**
```
Input: mã chứng chỉ
Button: Kiểm tra
→ GET /api/public/certificates/:id
→ Hiển thị VerifyResult
```

**Tab “Theo file”**
```
FileDropzone (PDF/PNG/JPG ≤ 5MB)
→ tính SHA-256 client-side
→ GET /api/public/verify?hash=...
→ Hiển thị VerifyResult
```

`VerifyResult` gồm:

- Badge trạng thái
- Tên SV, MSSV, ngành, năm, GPA, xếp loại
- Đơn vị cấp, ngày cấp
- Link Etherscan tx
- Nút “Xem trang chứng chỉ” → `/c/[id]`
- Nút “Tải PDF gốc” nếu hợp lệ

**Quan trọng:** trạng thái lấy từ chain, không lấy từ cache DB.

### 6.3 `/search` — Tra cứu kiểu Google

Ba trạng thái trên **cùng một route**, chuyển đổi mượt:

```
State A: Initial          State B: Results           State C: Detail
(chỉ có ô search)    →    (bảng tổng quan)      →    /c/[id]
```

#### State A — Initial (giống trang chủ Google)

```
                    ┌─────────────────────────────┐
                    │        [con dấu vàng]        │
                    │   Tra cứu chứng chỉ          │
                    │   ┌───────────────────────┐  │
                    │   │ 🔍 Nhập MSSV, họ tên… │  │
                    │   └───────────────────────┘  │
                    │   Gợi ý: 2311095 · Nguyễn…   │
                    │   · UIT-2024-CS-0001          │
                    └─────────────────────────────┘
```

- Không hiển thị bảng, không hiển thị bộ lọc.
- Ô search lớn, viền vàng, focus ring vàng.
- Chip gợi ý bấm được → điền và tìm ngay.
- Enter hoặc bấm icon → chuyển State B.
- Nếu URL có `?q=` sẵn (từ landing) → vào thẳng State B.

#### State B — Results

```
┌──────────────────────────────────────────────────────────┐
│ [con dấu]  Tra cứu chứng chỉ                             │
│ ┌──────────────────────────────────────┐  [Tìm kiếm]     │
│ │ 🔍 nguyen van an                     │                 │
│ └──────────────────────────────────────┘                 │
│ Tìm thấy 12 kết quả cho “nguyen van an”                  │
│ [Năm 2026 ▾] [Ngành CNTT ▾] [Trạng thái ▾] [Xóa lọc]    │
├──────┬───────────────┬──────────┬──────┬──────┬──────────┤
│ MSSV │ Họ tên        │ Ngành    │ Năm  │ GPA  │ Trạng thái│
├──────┼───────────────┼──────────┼──────┼──────┼──────────┤
│ 2311 │ Nguyễn Văn An │ CNTT     │ 2026 │ 3.45 │ ✅ Hợp lệ │
│ 2311 │ Nguyễn Văn Bình│ KTPM    │ 2025 │ 3.10 │ ✅ Hợp lệ │
└──────┴───────────────┴──────────┴──────┴──────┴──────────┘
                    Trang 1 / 2   [1] [2] [›]
```

**Hành vi:**

- Ô search thu nhỏ, **sticky** ở đầu trang khi cuộn.
- Bảng chỉ là **tổng quan** — không hiển thị toàn bộ chi tiết.
- Click một dòng → `/c/[id]` (văn bằng chính thức).
- Bộ lọc là chip/dropdown, áp dụng ngay, không cần bấm “Tìm” lần nữa.
- Nút “Xóa lọc” reset về trạng thái ban đầu.

**URL đồng bộ:**

```
/search?q=nguyen+van+an&year=2026&major=CNTT&status=active&page=1
```

Nhờ vậy: refresh không mất kết quả, copy link chia sẻ được, nút Back hoạt động đúng.

#### State C — Detail

`/c/[id]` — trang văn bằng chính thức, không phải modal.

#### Tìm kiếm một ô, nhiều trường

Một input `q` tìm trên:

| Người dùng gõ | Hệ thống hiểu |
|---|---|
| `2311095` | MSSV — ưu tiên khớp chính xác |
| `Nguyễn Văn An` | Họ tên — bỏ dấu, tìm gần đúng |
| `UIT-2024-CS-0001` | Mã chứng chỉ — khớp chính xác |
| `CNTT` | Ngành — khớp tên/mã ngành |

**Quy tắc:**

- Nếu `q` toàn số (6–12 ký tự) → thử MSSV trước.
- Nếu `q` khớp pattern mã chứng chỉ → thử mã trước.
- Còn lại → tìm theo tên đã chuẩn hóa + ngành.
- Debounce 400ms; Enter tìm ngay.
- Không có kết quả → “Không tìm thấy chứng chỉ nào khớp. Thử MSSV hoặc mã chứng chỉ.”

#### Bộ lọc

| Filter | Nguồn | Hành vi |
|---|---|---|
| Năm | `GET /api/public/filters` | Dropdown, chọn 1 |
| Ngành | cùng API | Dropdown, chọn 1 |
| Trạng thái | cố định | Tất cả / Hợp lệ / Đã thu hồi |

- Filter kết hợp với `q` bằng AND.
- Hiển thị số lượng kết quả sau khi lọc.
- Mobile: bộ lọc mở trong bottom sheet.

#### Trạng thái phụ

| Trạng thái | Hiển thị |
|---|---|
| Đang tải | Skeleton 5 dòng |
| Không kết quả | Empty state + gợi ý |
| Lỗi API | “Không thể tải dữ liệu” + nút thử lại |
| Mất mạng | Banner + giữ kết quả cũ nếu có |

#### Chuyển động

- State A → B: ô search thu nhỏ và trượt lên, bảng fade-in 200ms.
- Tôn trọng `prefers-reduced-motion`: tắt animation, chỉ đổi trạng thái.

#### Phím tắt

| Phím | Hành động |
|---|---|
| `/` | Focus ô search |
| `Enter` | Tìm |
| `Esc` | Xóa query, về State A |

### 6.4 `/c/[id]` — Trang công khai của chứng chỉ

Đây là đích của link in trong PDF.

| Khối | Nội dung |
|---|---|
| Chứng chỉ | Card lớn: logo trường, tên SV, ngành, năm, GPA, xếp loại |
| Trạng thái | Badge đọc từ chain + block number |
| Thông tin | Mã chứng chỉ, đơn vị cấp, ngày cấp |
| Hành động | Tải PDF (IPFS), mở Etherscan, copy link |
| QR | QR trỏ lại chính trang này (P1) |
| Cảnh báo | Nếu revoked: banner đỏ “Chứng chỉ này đã bị thu hồi” |

**Lưu ý:** trang này **không** hiển thị trạng thái lấy từ PDF; luôn gọi chain.

### 6.5 `/login`

- Email + password.
- Hiển thị lỗi chung “Email hoặc mật khẩu không đúng”, không tiết lộ email tồn tại.
- Sau đăng nhập: redirect `/issuer` hoặc `/admin`.
- Lưu token (xem mục 9).

### 6.6 `/issuer` — Dashboard

| Khối | Nội dung |
|---|---|
| Stats | Tổng đã cấp, đang hiệu lực, đã thu hồi |
| CTA | “Cấp chứng chỉ mới” |
| Bảng | Mã, SV, ngành, năm, trạng thái, ngày cấp |
| Bộ lọc | Tìm theo mã/MSSV, lọc trạng thái |
| Phân trang | 10/trang |

Chỉ hiển thị chứng chỉ do issuer đang đăng nhập cấp.

### 6.7 `/issuer/issue` — Form cấp chứng chỉ

**Bước 1 — Nhập thông tin**

| Field | Validate |
|---|---|
| Mã chứng chỉ | `^[A-Z0-9-]{6,64}$`, unique |
| Họ tên SV | 2–100 ký tự |
| MSSV | `^[0-9]{6,12}$` |
| Ngành | chọn từ danh sách |
| Năm tốt nghiệp | 2000–2100 |
| GPA | 0–4, bước 0.01 |
| Xếp loại | tự suy ra từ GPA, cho sửa |

**Bước 2 — Tải PDF**

- Dropzone, chỉ PDF/PNG/JPG, ≤ 5MB.
- Hiển thị hash tính được ngay trên client (chỉ để xem trước).
- Upload → backend trả `cid` + `hash` (backend tính lại).

**Bước 3 — Ký on-chain**

- Kiểm tra mạng Sepolia.
- Gọi `issueCertificate(id, hash, cid)`.
- MetaMask mở → người dùng ký.
- Chờ `tx.wait()`.

**Bước 4 — Lưu metadata**

- Gọi `POST /api/certificates` kèm `txHash`.
- Backend xác minh receipt + event trước khi lưu.

**Progress stepper:**

```
① Nhập thông tin → ② Tải file → ③ Ký ví → ④ Xác nhận on-chain → ⑤ Hoàn tất
```

**Xử lý lỗi:**

| Lỗi | Thông báo |
|---|---|
| `4001` user rejected | “Bạn đã từ chối giao dịch” |
| Sai mạng | “Vui lòng chuyển sang Sepolia” |
| Trùng mã | “Mã chứng chỉ đã tồn tại” |
| Trùng hash | “File này đã được cấp chứng chỉ” |
| Thiếu phí | “Ví không đủ SepoliaETH” |
| API lỗi sau khi tx thành công | “Đã ghi on-chain, đang đồng bộ lại…” + nút thử lại |

### 6.8 `/issuer/certificates/[id]` — Chi tiết & thu hồi

- Hiển thị đầy đủ + trạng thái on-chain.
- Nút **Thu hồi** (đỏ), chỉ issuer sở hữu hoặc admin.
- Modal xác nhận 2 bước: nhập lại mã chứng chỉ để xác nhận.
- Sau revoke: cập nhật UI, hiện tx hash.

### 6.9 `/admin/issuers` (P1)

- Danh sách issuer: tên, ví, trạng thái on-chain.
- Form thêm issuer: địa chỉ ví + tên.
- Gọi `addIssuer` bằng ví admin.
- Không cho sửa trực tiếp DB — phải qua chain.

---

## 7. Component chính

| Component | Trách nhiệm |
|---|---|
| `Header` | Logo, nav, ConnectButton |
| `ConnectButton` | Trạng thái ví: chưa cài / chưa kết nối / đã kết nối / sai mạng |
| `NetworkGuard` | Chặn thao tác nếu không phải Sepolia |
| `StatusBadge` | 4 trạng thái |
| `CertificateCard` | Hiển thị chứng chỉ dạng trang trọng |
| `RecentCertificates` | Widget 6 chứng chỉ cấp gần đây, tự refresh 30s |
| `SearchHero` | State A: con dấu, tiêu đề, ô search lớn |
| `SearchBar` | Ô search sticky, phím tắt `/`, `Esc` |
| `SearchFilters` | Chip/dropdown năm, ngành, trạng thái |
| `ResultTable` | Bảng tổng quan kết quả |
| `ResultRow` | Một dòng, click → `/c/[id]` |
| `SearchEmpty` / `SearchSkeleton` | Không kết quả / đang tải |
| `CertificateTable` | Bảng trong dashboard issuer |
| `FileDropzone` | Kéo thả, validate MIME/size |
| `HashPreview` | Hiện hash rút gọn + copy |
| `IssueForm` | Form 4 bước |
| `TxStatus` | Pending / success / rejected / reverted |
| `TxLink` | Link Etherscan |
| `PdfButton` | Tải PDF từ IPFS |
| `ConfirmDialog` | Xác nhận thu hồi |
| `EmptyState` / `ErrorState` / `Skeleton` | Trạng thái UI |
| `Toast` | Thông báo |

---

## 8. Kết nối blockchain

### 8.1 Provider

```ts
// đọc công khai
const readProvider = new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

// ghi qua ví
const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const contract = new Contract(ADDRESS, ABI, signer);
```

### 8.2 Chuyển mạng

```ts
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0xaa36a7' }],
});
```

Nếu lỗi `4902` (chưa có mạng):

```ts
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0xaa36a7',
    chainName: 'Sepolia',
    nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
  }],
});
```

### 8.3 Lắng nghe sự kiện ví

```ts
window.ethereum.on('accountsChanged', ...)
window.ethereum.on('chainChanged', () => window.location.reload())
```

### 8.4 Hydration

`window.ethereum` chỉ có ở client. Mọi component dùng ví phải:

```ts
const WalletButton = dynamic(() => import('./ConnectButton'), { ssr: false });
```

Tránh lỗi “window is not defined” và mismatch khi build.

---

## 9. API & xác thực

### 9.1 Client

```ts
// lib/api.ts
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new ApiError(await res.json());
  return res.json();
}
```

**Lưu token:** `localStorage` cho đơn giản. Ghi rõ trong báo cáo: production nên dùng httpOnly cookie.

### 9.2 Endpoint dùng ở frontend

| Method | Path | Dùng ở |
|---|---|---|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Khôi phục phiên |
| GET | `/api/public/certificates` | Search |
| GET | `/api/public/certificates/:id` | Verify, `/c/[id]` |
| GET | `/api/public/verify?hash=` | Verify file |
| GET | `/api/public/filters` | Dropdown năm/ngành |
| POST | `/api/uploads` | Issue |
| POST | `/api/certificates` | Issue |
| GET | `/api/certificates` | Issuer dashboard |
| GET | `/api/certificates/:id` | Issuer detail |
| POST | `/api/certificates/:id/revoke` | Revoke |
| GET | `/api/issuers` | Admin |
| POST | `/api/issuers` | Admin |
| GET | `/api/health` | Warm-up Render |

---

## 10. Kiểu dữ liệu

```ts
export type CertificateStatus = 'active' | 'revoked';
export type ArtifactType = 'pdf' | 'image' | 'web';

export interface Certificate {
  certificateId: string;
  studentName: string;
  studentCode: string;
  major: string;
  graduationYear: number;
  gpa: number | null;
  classification: string | null;
  issuedAt: string;
  status: CertificateStatus;
  artifactType: ArtifactType;
  issuerName: string;
  verifyUrl: string;
  txHash?: string;
  ipfsCid?: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
```

---

## 11. Trạng thái & luồng dữ liệu

```
AuthContext      → user, token, login, logout
WalletContext    → address, chainId, connect, switchNetwork
React Query      → danh sách, chi tiết, filters
Local state      → form, modal, tab
```

Quy tắc:

- Không cache trạng thái chứng chỉ quá 30 giây.
- Sau revoke: invalidate query danh sách + chi tiết.
- Sau issue: invalidate dashboard + search.

---

## 12. Kế hoạch triển khai 7 ngày

| Ngày | Việc | Kết quả |
|---|---|---|
| 1 | Khởi tạo Next.js, Tailwind, layout, token màu, UI primitives | Trang khung chạy |
| 2 | Wallet: connect, network guard, header | Kết nối MetaMask được |
| 3 | `/verify` + `/c/[id]` + hash file | Tra cứu hoạt động (mock API) |
| 4 | `/search`: State A → B, filters, pagination, URL sync | Tra cứu kiểu Google |
| 5 | `/login` + `/issuer` dashboard | Đăng nhập, xem danh sách |
| 6 | `/issuer/issue` + tx flow | Cấp được chứng chỉ thật |
| 7 | Revoke, polish, responsive, deploy Vercel | Demo end-to-end |

Dự phòng 1–2 ngày cho lỗi tích hợp.

---

## 13. Kiểm thử

### 13.1 Checklist thủ công

- [ ] Chưa cài MetaMask → hiện hướng dẫn, không crash
- [ ] Chưa kết nối → nút Connect hoạt động
- [ ] Sai mạng → chặn thao tác, hiện nút Switch
- [ ] Chuyển tài khoản MetaMask → UI cập nhật
- [ ] Verify mã đúng → ✅
- [ ] Verify mã sai → ⚠️
- [ ] Verify file đúng → ✅
- [ ] Sửa 1 byte PDF → ❌
- [ ] Verify chứng chỉ đã revoke → ❌
- [ ] Search theo năm/ngành/MSSV/tên
- [ ] Phân trang, filter kết hợp
- [ ] Cấp chứng chỉ: từ chối ký → không treo
- [ ] Cấp chứng chỉ: ký thành công → hiện tx
- [ ] Revoke → trạng thái đổi ngay
- [ ] Mobile 375px không vỡ layout
- [ ] Refresh `/c/[id]` không lỗi

### 13.2 Playwright (P1)

- [ ] Luồng verify theo mã
- [ ] Luồng issue (dùng ví test, chạy local Hardhat)
- [ ] Luồng revoke

---

## 14. Deploy Vercel

| Mục | Giá trị |
|---|---|
| Root Directory | `frontend` |
| Framework | Next.js |
| Build Command | mặc định `next build` |
| Output | `.next` (mặc định) |
| Node | 24.x |
| Env | chỉ `NEXT_PUBLIC_*` |

**Checklist:**

- [ ] `NEXT_PUBLIC_API_URL` trỏ đúng Render
- [ ] `NEXT_PUBLIC_CONTRACT_ADDRESS` đúng
- [ ] `NEXT_PUBLIC_CHAIN_ID=11155111`
- [ ] Build production không lỗi TypeScript
- [ ] Redeploy sau khi đổi env
- [ ] CORS backend cho domain Vercel
- [ ] Preview deployment cho nhánh feature

---

## 15. Rủi ro & cách xử lý

| Rủi ro | Ảnh hưởng | Xử lý |
|---|---|---|
| Render cold start 30–60s | Trang chậm lần đầu | Skeleton + warm-up `/api/health` |
| CORS sai | API fail | Set `FRONTEND_ORIGIN` đúng, redeploy backend |
| `window.ethereum` undefined | Crash SSR | `dynamic(..., { ssr: false })` |
| Hydration mismatch | Warning/blank | Không đọc localStorage lúc render server |
| Sai mạng | Tx fail | NetworkGuard + switch |
| User reject tx | Treo UI | Bắt `4001`, reset state |
| Pinata gateway chậm | Tải PDF lâu | Spinner + fallback gateway |
| Ảnh/PDF quá lớn | Upload fail | Giới hạn 5MB client + server |
| JWT hết hạn | 401 | Interceptor → redirect login |
| BigInt từ ethers | Serialize lỗi | Chuyển `Number()` trước khi JSON |

---

## 16. Definition of Done

- [ ] Landing, verify, search, `/c/[id]` chạy
- [ ] Login + dashboard issuer
- [ ] Cấp chứng chỉ thật trên Sepolia
- [ ] Thu hồi và trạng thái cập nhật tức thì
- [ ] Search theo 4 tiêu chí
- [ ] Mobile responsive
- [ ] Không lộ secret trong bundle
- [ ] Deploy Vercel thành công
- [ ] Có preview URL cho nhánh feature
- [ ] README hướng dẫn chạy local
