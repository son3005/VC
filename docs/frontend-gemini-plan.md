# Frontend Implementation Plan — cho Gemini 3.8 Flash

> Tài liệu này đủ chi tiết để một model khác thực hiện toàn bộ frontend mà không cần đọc lại lịch sử chat.
>
> Stack: **Next.js 15 App Router · TypeScript · Tailwind CSS · ethers v6 · MetaMask · React Query · Vercel**

---

## 0. Vai trò và cách thực thi

Bạn là **senior frontend engineer**. Hãy:

1. Đọc toàn bộ tài liệu này trước khi code.
2. Thực hiện theo đúng thứ tự phase.
3. Sau mỗi phase: chạy `npm run lint` và `npm run build`.
4. Không sửa backend, contract, database.
5. Không commit secret.
6. Làm việc trên nhánh `feature/frontend`; mở PR vào `main`.
7. Không push trực tiếp `main` — repo có ruleset bắt buộc PR + 5 status checks.

Khi xong, bàn giao:

- Source code trong `frontend/`
- `frontend/README.md` hướng dẫn chạy
- PR link
- Vercel Preview URL
- Danh sách ảnh chụp các màn hình chính

---

## 1. Trạng thái hệ thống hiện tại

| Thành phần | Giá trị |
|---|---|
| Backend production | `https://vc-api-a3i5.onrender.com` |
| Network | Ethereum Sepolia — chain ID `11155111` |
| Chain ID hex | `0xaa36a7` |
| Contract | `0xE939E96E210A4eC13eF85F45193022e5b235fA56` |
| Deploy block | `11953245` |
| Contract owner/admin | `0x9b8DF93f172AAEB67C31be257C9E4a55a8df1b3B` |
| Issuer | `0xf009863379F6B0056C1D828fDE2827fD94202a1B` |
| Issuer name | Khoa Công nghệ Thông tin |
| Certificate count | 0 — cần cấp mới để test |
| Backend API docs | `docs/api-reference.md` |
| Contract ABI | `shared/abi/CertificateRegistry.json` |

Backend đã có:

- JWT auth
- Upload Pinata
- Sinh PDF bằng PDFKit
- Public search/verify
- Admin stats/certificates
- Chain listener + backfill

---

## 2. Ràng buộc bắt buộc

### 2.1 Không được làm

- Không sửa `backend/`, `contracts/`.
- Không gọi contract bằng private key trong frontend.
- Không hardcode secret.
- Không dùng API key Pinata/Mongo trong frontend.
- Không tự tính lại hash khác backend.
- Không hiển thị trạng thái chứng chỉ từ cache DB; trang public phải dùng API detail (backend đọc chain).
- Không dùng endpoint cũ `/api/uploads` trong luồng cấp chứng chỉ chuẩn.
- Không push trực tiếp `main`.

### 2.2 Phải làm

- Mọi thao tác ghi on-chain qua MetaMask.
- Kiểm tra đúng mạng Sepolia trước khi ký.
- Kiểm tra ví đang đăng nhập khớp `user.walletAddress` trước khi ký.
- Dùng `/api/certificates/prepare` để sinh PDF + hash + CID.
- Sau khi MetaMask tx confirmed, gọi `/api/certificates/confirm`.
- Xử lý `4001` (user reject), sai mạng, thiếu phí, API lỗi.
- Responsive tới 375px.
- Tất cả text tiếng Việt.

---

## 3. Stack và phiên bản

```bash
npx create-next-app@15.5.4 frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --use-npm
```

Cài thêm:

```bash
cd frontend
npm install ethers@^6.13.4 \
  @tanstack/react-query@^5 \
  react-hook-form@^7 \
  zod@^3 \
  @hookform/resolvers@^3 \
  react-hot-toast@^2 \
  lucide-react@^0.468.0 \
  clsx@^2 \
  tailwind-merge@^2 \
  qrcode.react@^4
```

Không dùng MUI/Ant Design.

---

## 4. Biến môi trường

Tạo `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://vc-api-a3i5.onrender.com
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CHAIN_ID_HEX=0xaa36a7
NEXT_PUBLIC_CHAIN_NAME=Sepolia
NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_EXPLORER_URL=https://sepolia.etherscan.io
NEXT_PUBLIC_CONTRACT_ADDRESS=0xE939E96E210A4eC13eF85F45193022e5b235fA56
NEXT_PUBLIC_DEPLOY_BLOCK=11953245
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

Tạo `.env.example` tương tự, không có secret thật.

---

## 5. Cấu trúc file

```
frontend/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx
│  ├─ globals.css
│  ├─ providers.tsx
│  ├─ search/page.tsx
│  ├─ verify/page.tsx
│  ├─ c/[id]/page.tsx
│  ├─ login/page.tsx
│  ├─ issuer/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  ├─ issue/page.tsx
│  │  └─ certificates/[id]/page.tsx
│  └─ admin/
│     ├─ page.tsx
│     ├─ issuers/page.tsx
│     └─ certificates/page.tsx
├─ components/
│  ├─ layout/Header.tsx, Footer.tsx, Container.tsx
│  ├─ wallet/ConnectButton.tsx, NetworkGuard.tsx, WalletBadge.tsx
│  ├─ certificate/CertificateCard.tsx, StatusBadge.tsx, CertificateTable.tsx, PdfButton.tsx
│  ├─ search/SearchBar.tsx, SearchHero.tsx, SearchFilters.tsx, RecentCertificates.tsx
│  ├─ verify/FileDropzone.tsx, VerifyResult.tsx
│  ├─ forms/LoginForm.tsx, IssueWizard.tsx
│  ├─ tx/TxStatus.tsx, TxLink.tsx
│  └─ ui/Button.tsx, Input.tsx, Select.tsx, Modal.tsx, Skeleton.tsx, EmptyState.tsx
├─ hooks/
│  ├─ useAuth.ts
│  ├─ useWallet.ts
│  ├─ useDebounce.ts
│  └─ useIssue.ts
├─ lib/
│  ├─ api.ts
│  ├─ contract.ts
│  ├─ abi/CertificateRegistry.json
│  ├─ format.ts
│  ├─ validation.ts
│  ├─ constants.ts
│  └─ utils.ts
├─ types/api.ts
└─ public/logo.svg
```

Copy ABI:

```bash
mkdir -p lib/abi
cp ../shared/abi/CertificateRegistry.json lib/abi/CertificateRegistry.json
```

---

## 6. Thiết kế

### 6.1 Màu

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

Quy tắc:

- Nền `bg`, card `surface`.
- Chữ chính `primary`, phụ `muted`.
- `neutral` chỉ viền/divider, không làm chữ.
- Vàng `secondary` cho CTA, focus ring, badge hợp lệ.
- Đỏ `accent-strong` cho chữ lỗi/thu hồi.

### 6.2 Font

Dùng `next/font/google`:

- `Be_Vietnam_Pro` — body
- `Playfair_Display` — tiêu đề

### 6.3 UI

- Nền kem, viền mảnh, khoảng thở rộng.
- Không gradient rực, không glassmorphism.
- Card bo góc 16px, border `--color-border`.
- Nút chính nền `primary`, chữ `secondary`.
- Badge trạng thái theo bảng:

| Trạng thái | Style |
|---|---|
| active | nền primary, chữ secondary |
| revoked | nền accent 12%, chữ accent-strong |
| not found | nền neutral 15%, chữ muted |
| loading | spinner vàng |

---

## 7. Types

Tạo `types/api.ts`:

```ts
export type Role = 'admin' | 'issuer';
export type CertificateStatus = 'active' | 'revoked';
export type CertificateType = 'degree' | 'course' | 'credit' | 'other';
export type ArtifactType = 'pdf' | 'image' | 'web';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  walletAddress: string | null;
}

export interface Issuer {
  id: string;
  name: string;
  code: string;
  walletAddress: string;
  logoUrl: string | null;
  website: string | null;
  isActive: boolean;
  onChainActive: boolean;
}

export interface CertificateSummary {
  certificateId: string;
  certificateType: CertificateType;
  studentName: string;
  studentCode: string;
  major: string | null;
  graduationYear: number | null;
  gpa: number | null;
  classification: string | null;
  issuedAt: string;
  status: CertificateStatus;
  verifyUrl: string;
}

export interface CertificateDetail extends CertificateSummary {
  details: Record<string, unknown>;
  templateId: string;
  templateVersion: string;
  issuerName: string;
  artifactType: ArtifactType;
  mimeType: string;
  filename: string;
  sizeBytes: number;
  ipfsCid: string;
  txHash: string;
  blockNumber: number;
  statusSource: 'chain';
}

export interface RecentCertificate {
  certificateId: string;
  studentNameMasked: string;
  studentCodeMasked: string;
  major: string | null;
  graduationYear: number | null;
  issuedAt: string;
  status: CertificateStatus;
  txHash: string;
  blockNumber: number;
}

export interface CertificateIssuer {
  certificateId: string;
  certificateType: CertificateType;
  studentName: string;
  studentCode: string;
  major: string | null;
  graduationYear: number | null;
  gpa: number | null;
  classification: string | null;
  artifactType: ArtifactType;
  filename: string;
  status: CertificateStatus;
  issuedAt: string;
  txHash: string;
  revokedAt: string | null;
  revokeTxHash: string | null;
}
```

---

## 8. API client

Tạo `lib/api.ts`:

```ts
import type {
  AdminStats,
  ApiError,
  ApiSuccess,
  CertificateDetail,
  CertificateIssuer,
  CertificateSummary,
  Issuer,
  PaginationMeta,
  RecentCertificate,
  User,
} from '@/types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

export class ApiRequestError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: PaginationMeta }> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('vc_token') : null;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const json = (await res.json()) as ApiSuccess<T> | ApiError;

  if (!res.ok || json.success === false) {
    const err = json as ApiError;
    throw new ApiRequestError(
      res.status,
      err.error?.code ?? 'UNKNOWN',
      err.error?.message ?? 'Có lỗi xảy ra',
      err.error?.details
    );
  }

  return { data: json.data, meta: json.meta };
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: User }>('/api/auth/me'),

  searchCertificates: (params: URLSearchParams) =>
    request<CertificateSummary[]>(`/api/public/certificates?${params}`),

  recentCertificates: (limit = 6) =>
    request<RecentCertificate[]>(
      `/api/public/certificates/recent?limit=${limit}`
    ),

  certificateDetail: (id: string) =>
    request<CertificateDetail>(`/api/public/certificates/${id}`),

  verifyHash: (hash: string) =>
    request<{
      exists: boolean;
      valid: boolean;
      certificateId: string | null;
      issuer: string | null;
      issuedAt: string | null;
      certificate: CertificateDetail | null;
    }>(`/api/public/verify?hash=${encodeURIComponent(hash)}`),

  filters: () =>
    request<{ years: number[]; majors: string[]; types: string[] }>(
      '/api/public/filters'
    ),

  prepareCertificate: (body: unknown) =>
    request<{
      cid: string;
      fileHash: string;
      sizeBytes: number;
      templateId: string;
      templateVersion: string;
      filename: string;
    }>('/api/certificates/prepare', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  confirmCertificate: (body: unknown) =>
    request<CertificateIssuer>('/api/certificates/confirm', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  issuerCertificates: (params: URLSearchParams) =>
    request<CertificateIssuer[]>(`/api/certificates?${params}`),

  issuerCertificate: (id: string) =>
    request<CertificateIssuer>(`/api/certificates/${id}`),

  revokeCertificate: (id: string, txHash: string) =>
    request<CertificateIssuer>(`/api/certificates/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ txHash }),
    }),

  issuers: (params?: URLSearchParams) =>
    request<Issuer[]>(`/api/issuers${params ? `?${params}` : ''}`),

  createIssuer: (body: unknown) =>
    request<Issuer>('/api/issuers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  adminStats: () => request<AdminStats>('/api/admin/stats'),

  adminCertificates: (params: URLSearchParams) =>
    request<CertificateIssuer[]>(`/api/admin/certificates?${params}`),
};
```

Thêm `AdminStats` type:

```ts
export interface AdminStats {
  certificates: { total: number; active: number; revoked: number };
  issuers: { total: number; active: number };
  users: number;
  byType: Record<CertificateType, number>;
  recent: Array<{
    certificateId: string;
    studentName: string;
    studentCode: string;
    certificateType: CertificateType;
    status: string;
    issuedAt: string;
  }>;
}
```

Lưu token:

```ts
localStorage.setItem('vc_token', token);
```

Khi 401: xóa token, redirect `/login`.

---

## 9. Wallet

### 9.1 `useWallet`

Yêu cầu:

- `address`, `chainId`, `isConnecting`, `error`
- `connect()`
- `switchToSepolia()`
- lắng nghe `accountsChanged`, `chainChanged`
- chỉ dùng client

Pseudo:

```ts
'use client';

import { BrowserProvider } from 'ethers';

const SEPOLIA_HEX = '0xaa36a7';

export function useWallet() {
  // state...
  async function connect() {
    if (!window.ethereum) throw new Error('NO_METAMASK');
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    const network = await provider.getNetwork();
    // set state
  }

  async function switchToSepolia() {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_HEX }],
    });
  }
}
```

Nếu lỗi `4902`, gọi `wallet_addEthereumChain` với:

```ts
{
  chainId: '0xaa36a7',
  chainName: 'Sepolia',
  nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
}
```

### 9.2 `ConnectButton`

Trạng thái:

| Trạng thái | UI |
|---|---|
| Không có MetaMask | “Cài MetaMask” + link |
| Chưa kết nối | “Kết nối ví” |
| Đã kết nối đúng mạng | `0x9b8D...1b3B` + dot vàng |
| Sai mạng | “Chuyển sang Sepolia” |

Component dùng ví phải `dynamic(..., { ssr: false })`.

---

## 10. Contract

Tạo `lib/contract.ts`:

```ts
import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers';
import abi from './abi/CertificateRegistry.json';

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

export function getReadContract() {
  const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL!);
  return new Contract(CONTRACT_ADDRESS, abi, provider);
}

export async function getWriteContract() {
  if (!window.ethereum) throw new Error('NO_METAMASK');
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, abi, signer);
}

export async function issueCertificateOnChain(
  certificateId: string,
  fileHash: string,
  cid: string
): Promise<string> {
  const contract = await getWriteContract();
  const tx = await contract.issueCertificate(certificateId, fileHash, cid);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function revokeCertificateOnChain(
  certificateId: string
): Promise<string> {
  const contract = await getWriteContract();
  const tx = await contract.revokeCertificate(certificateId);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function addIssuerOnChain(
  wallet: string,
  name: string
): Promise<string> {
  const contract = await getWriteContract();
  const tx = await contract.addIssuer(wallet, name);
  const receipt = await tx.wait();
  return receipt.hash;
}
```

Trước khi ký:

1. `chainId === 11155111`
2. `walletAddress === user.walletAddress`
3. issuer role cho issue; admin role cho addIssuer.

---

## 11. Pages

### 11.1 `app/layout.tsx`

- Font Be Vietnam Pro + Playfair Display.
- `<Providers>` gồm React Query + Toaster.
- Header + Footer.
- Metadata tiếng Việt.

### 11.2 `/` Landing

Nội dung:

1. Hero:
   - “Xác thực chứng chỉ bằng blockchain”
   - subtitle ngắn
   - search bar lớn
2. Nút:
   - “Tra cứu bằng file PDF” → `/verify`
   - “Đăng nhập nhà trường” → `/login`
3. 3 bước:
   - Cấp chứng chỉ
   - Lưu IPFS + neo hash
   - Tra cứu on-chain
4. Widget recent:
   - `GET /api/public/certificates/recent?limit=6`
   - skeleton 3 dòng
   - lỗi → ẩn widget
   - item click → `/c/[id]`

Search bar Enter:

```
/search?q=<encodeURIComponent(value)>
```

### 11.3 `/search`

Client component.

- State A: chỉ search lớn + recent.
- State B: search sticky + filters + table + pagination.
- URL sync:
  ```
  /search?q=&year=&major=&status=&page=
  ```
- Gọi:
  ```
  GET /api/public/certificates?q=&year=&major=&status=&page=&limit=20
  ```
- Filters:
  - years/majors từ `/api/public/filters`
  - status: all/active/revoked
- Bảng cột:
  - MSSV, Họ tên, Ngành, Năm, GPA, Trạng thái
- Click row → `/c/[id]`.
- Empty state + retry.
- Debounce 400ms.
- `/` focus search; `Esc` clear.

### 11.4 `/verify`

Hai tab.

**Theo mã**

```
GET /api/public/certificates/:id
```

**Theo file**

- Dropzone PDF/PNG/JPG ≤ 5MB.
- Tính SHA-256 client-side:

```ts
const buffer = await file.arrayBuffer();
const digest = await crypto.subtle.digest('SHA-256', buffer);
const hex = Array.from(new Uint8Array(digest))
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('');
const hash = `sha256:${hex}`;
```

- Gọi:
  ```
  GET /api/public/verify?hash=sha256:...
  ```

Hiển thị:

- Badge
- Tên, MSSV, ngành, năm, GPA
- Đơn vị cấp, ngày cấp
- txHash + Etherscan
- link `/c/[id]`
- nếu hợp lệ: nút tải PDF từ IPFS

### 11.5 `/c/[id]`

Client component dùng `useParams`.

Gọi:

```
GET /api/public/certificates/:id
```

Hiển thị:

- Card chứng chỉ
- Badge trạng thái từ chain
- Thông tin chi tiết theo `certificateType`
- issuer, ngày cấp
- txHash + Etherscan
- nút tải PDF
- nếu `revoked`: banner đỏ
- QR trỏ chính URL này

Không tự suy ra trạng thái từ DB.

### 11.6 `/login`

Form email/password.

- Gọi `/api/auth/login`.
- Lưu `vc_token`.
- Lưu user vào localStorage hoặc context.
- Redirect:
  - `issuer` → `/issuer`
  - `admin` → `/admin`
- Lỗi chung: “Email hoặc mật khẩu không đúng”.

### 11.7 `/issuer`

Bảo vệ:

- Có token
- `user.role === 'issuer'`
- nếu không → `/login`

Gọi:

```
GET /api/certificates?page=&limit=10&q=&status=
```

Hiển thị:

- Stats: total/active/revoked (tính từ danh sách hoặc gọi admin stats? issuer không có stats endpoint; tính từ list meta + filter)
- Nút “Cấp chứng chỉ mới” → `/issuer/issue`
- Bảng chứng chỉ
- Filter/search
- Pagination

### 11.8 `/issuer/issue`

Wizard 4 bước.

#### Bước 1 — Chọn loại + nhập dữ liệu

Loại:

```
degree | course | credit | other
```

Validate:

- certificateId đúng prefix:
  - `UIT-DEG-\d{4}-\d{4}`
  - `UIT-CRS-\d{4}-\d{4}`
  - `UIT-CRE-\d{4}-\d{4}`
  - `UIT-OTH-\d{4}-\d{4}`
- studentName 2–100
- studentCode 6–12 số
- Details theo loại, dùng zod giống backend.

#### Bước 2 — Preview + Prepare

Gọi:

```
POST /api/certificates/prepare
```

Body:

```json
{
  "certificateType": "degree",
  "certificateId": "UIT-DEG-2026-0001",
  "studentName": "Nguyễn Văn An",
  "studentCode": "2311095",
  "details": {
    "degreeTitle": "Cử nhân",
    "major": "Kỹ thuật phần mềm",
    "graduationYear": 2026,
    "gpa": 3.45,
    "classification": "Giỏi",
    "studyMode": "Chính quy"
  }
}
```

Response:

```json
{
  "cid": "Qm...",
  "fileHash": "sha256:...",
  "sizeBytes": 34499,
  "templateId": "degree-v1",
  "templateVersion": "1.0.0",
  "filename": "UIT-DEG-2026-0001.pdf"
}
```

Hiển thị:

- CID
- hash
- size
- link tải PDF từ IPFS
- nút “Tiếp tục ký”

#### Bước 3 — Ký

Kiểm tra:

- MetaMask có
- đúng Sepolia
- ví hiện tại === `user.walletAddress`
- role issuer

Gọi:

```ts
issueCertificateOnChain(certificateId, fileHash, cid)
```

Hiển thị TxStatus:

- pending
- success + txHash
- rejected
- reverted

#### Bước 4 — Confirm API

Gọi:

```
POST /api/certificates/confirm
```

Body:

```json
{
  "certificateType": "degree",
  "certificateId": "UIT-DEG-2026-0001",
  "studentName": "Nguyễn Văn An",
  "studentCode": "2311095",
  "details": { "...": "..." },
  "fileHash": "sha256:...",
  "ipfsCid": "Qm...",
  "artifactType": "pdf",
  "mimeType": "application/pdf",
  "filename": "UIT-DEG-2026-0001.pdf",
  "sizeBytes": 34499,
  "templateId": "degree-v1",
  "templateVersion": "1.0.0",
  "txHash": "0x..."
}
```

Thành công:

- Toast
- Link `/c/[id]`
- Nút “Cấp chứng chỉ khác”

Lỗi sau khi tx thành công:

- Hiện “Đã ghi on-chain, đang đồng bộ lại…”
- Nút “Thử lưu lại” gọi confirm lại với cùng txHash.

### 11.9 `/issuer/certificates/[id]`

Gọi:

```
GET /api/certificates/:id
```

Hiển thị đầy đủ.

Nút Thu hồi:

- Chỉ issuer sở hữu hoặc admin.
- Modal nhập lại `certificateId`.
- Gọi `revokeCertificateOnChain(id)`.
- Sau tx: `POST /api/certificates/:id/revoke` với `txHash`.
- Refresh detail.

### 11.10 `/admin`

Bảo vệ role admin.

Gọi:

```
GET /api/admin/stats
GET /api/admin/certificates?page=1&limit=10
```

Hiển thị:

- Cards: certificates total/active/revoked, issuers, users
- byType
- recent
- bảng certificates + filter

### 11.11 `/admin/issuers`

Gọi:

```
GET /api/issuers
```

Form thêm issuer:

1. Nhập wallet + name/code.
2. Kiểm tra ví admin đúng owner.
3. Gọi `addIssuerOnChain(wallet, name)`.
4. Gọi `POST /api/issuers` với txHash + userId nếu có.
5. Refresh list.

Không sửa DB trực tiếp.

### 11.12 `/admin/certificates`

Gọi:

```
GET /api/admin/certificates
```

Filter + detail + revoke (owner wallet).

---

## 12. Xử lý lỗi

| Tình huống | UI |
|---|---|
| MetaMask chưa cài | Hướng dẫn cài, không crash |
| User reject `4001` | “Bạn đã từ chối giao dịch” |
| Sai mạng | Nút “Chuyển sang Sepolia” |
| Thiếu phí | “Ví không đủ SepoliaETH” |
| API 401 | Xóa token → `/login` |
| API 403 | “Bạn không có quyền” |
| API 409 | Hiện message backend |
| API 502/503 | “Server đang khởi động, thử lại sau 30s” |
| Render cold start | Skeleton + retry |
| Pinata gateway lỗi | Fallback gateway |

Không hiển thị stack trace.

---

## 13. Bảo mật frontend

- Chỉ dùng biến `NEXT_PUBLIC_*`.
- Không đưa `PINATA_JWT`, `MONGODB_URI`, `JWT_SECRET` vào frontend.
- Token lưu localStorage — ghi chú production nên httpOnly cookie.
- Không log token ra console.
- Validate input client + server.
- Không hiển thị địa chỉ ví đầy đủ nếu không cần; dùng `0x9b8D...1b3B`.

---

## 14. Testing checklist

### Build

```bash
npm run lint
npm run build
```

Phải pass.

### Manual

- [ ] `/` load, search Enter → `/search?q=...`
- [ ] Recent widget hiển thị hoặc skeleton
- [ ] `/search` filter năm/ngành/status
- [ ] URL refresh giữ filter
- [ ] `/verify` theo mã đúng/sai
- [ ] `/verify` theo file đúng/sai
- [ ] `/c/[id]` active
- [ ] `/c/[id]` revoked
- [ ] Login issuer → `/issuer`
- [ ] Login admin → `/admin`
- [ ] Issue wizard đủ 4 bước
- [ ] MetaMask reject không treo
- [ ] Issue xong thấy `/c/[id]`
- [ ] Revoke cập nhật trạng thái
- [ ] Mobile 375px không vỡ
- [ ] Refresh `/c/[id]` không lỗi
- [ ] Không có secret trong bundle

---

## 15. Deploy Vercel

1. Tạo project mới, root `frontend`.
2. Framework Next.js.
3. Env `NEXT_PUBLIC_*` như mục 4.
4. Deploy.
5. Lấy URL production.
6. Cập nhật Render:

```
FRONTEND_ORIGIN=https://<vercel-domain>
```

7. Redeploy backend.
8. Test CORS từ Vercel.
9. Kiểm tra QR PDF trỏ đúng domain Vercel.

Lưu ý: PDF đã tạo trước khi đổi `FRONTEND_ORIGIN` sẽ có QR cũ. Cấp lại chứng chỉ sau khi cập nhật.

---

## 16. Git workflow

```bash
git checkout main
git pull
git checkout -b feature/frontend
```

Commit nhỏ:

```
feat(frontend): scaffold Next.js and design tokens
feat(frontend): add public search and certificate detail
feat(frontend): add verify by id and file
feat(frontend): add auth and issuer dashboard
feat(frontend): add issue certificate wizard
feat(frontend): add admin dashboard
```

Push:

```bash
git push -u origin feature/frontend
```

Mở PR vào `main`, chờ checks:

```
Contracts
Backend
Frontend
Secret scan
Dependency audit (contracts)
Dependency audit (backend)
```

Không merge khi đỏ.

---

## 17. Definition of Done

- [ ] Next.js app chạy local
- [ ] Kết nối backend Render
- [ ] Landing + search + verify + detail
- [ ] Login + issuer dashboard
- [ ] Cấp chứng chỉ thật trên Sepolia
- [ ] Revoke hoạt động
- [ ] Admin stats + issuer list
- [ ] Responsive mobile
- [ ] `npm run lint` pass
- [ ] `npm run build` pass
- [ ] Vercel deploy thành công
- [ ] `FRONTEND_ORIGIN` cập nhật
- [ ] QR PDF trỏ đúng domain
- [ ] PR merged
- [ ] README frontend có hướng dẫn

---

## 18. Thứ tự thực hiện bắt buộc

```
Phase 1: Scaffold + layout + design tokens
Phase 2: API client + types + auth
Phase 3: Landing + search
Phase 4: Verify + certificate detail
Phase 5: Login + issuer dashboard
Phase 6: Issue wizard
Phase 7: Revoke
Phase 8: Admin
Phase 9: Responsive + polish
Phase 10: Vercel + CORS + QR
```

Không làm Phase 6 trước Phase 3–5.
