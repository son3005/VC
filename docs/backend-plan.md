# Kế hoạch Backend — Verify Certification

> Node.js 24 · Express · TypeScript · MongoDB Atlas · Pinata · ethers v6 · Render (Docker)
>
> Vai trò: cầu nối giữa blockchain, IPFS và giao diện. **Không giữ private key**, không thay thế blockchain.

---

## 1. Nguyên tắc thiết kế

| Nguyên tắc | Hệ quả |
|---|---|
| Blockchain là nguồn sự thật | `fileHash`, `issuer`, `issuedAt`, `isRevoked` luôn đọc từ chain khi verify |
| Backend không ký giao dịch | Mọi tx do MetaMask của issuer/admin ký |
| Không lưu file | File ở IPFS, DB chỉ giữ CID + hash |
| Không lưu PII on-chain | Tên, MSSV, GPA nằm ở MongoDB |
| Ghi DB sau khi tx confirmed | Không bao giờ lưu trước, tránh dữ liệu ma |
| Idempotent | `txHash + logIndex` unique, xử lý lại không tạo trùng |
| Fail fast | Validate env khi khởi động, thiếu biến thì dừng |

---

## 2. Cấu trúc thư mục

```
backend/
├─ src/
│  ├─ index.ts               # bootstrap: env → db → chain → server
│  ├─ app.ts                 # express app, middleware, routes
│  ├─ config/
│  │  ├─ env.ts              # zod validate process.env
│  │  ├─ db.ts               # mongoose connect + retry
│  │  └─ chain.ts            # provider, contract, wallet-free
│  ├─ models/
│  │  ├─ User.ts
│  │  ├─ Issuer.ts
│  │  ├─ Certificate.ts
│  │  ├─ ChainEvent.ts
│  │  ├─ SyncState.ts
│  │  └─ AuditLog.ts
│  ├─ routes/
│  │  ├─ auth.routes.ts
│  │  ├─ public.routes.ts
│  │  ├─ upload.routes.ts
│  │  ├─ certificate.routes.ts
│  │  ├─ issuer.routes.ts
│  │  └─ health.routes.ts
│  ├─ controllers/
│  ├─ services/
│  │  ├─ auth.service.ts
│  │  ├─ pinata.service.ts
│  │  ├─ chain.service.ts     # verify tx, đọc contract
│  │  ├─ certificate.service.ts
│  │  ├─ search.service.ts
│  │  └─ sync.service.ts      # listener + backfill
│  ├─ middleware/
│  │  ├─ auth.ts
│  │  ├─ validate.ts
│  │  ├─ error.ts
│  │  └─ rateLimit.ts
│  ├─ validators/
│  ├─ utils/
│  │  ├─ hash.ts
│  │  ├─ normalize.ts
│  │  ├─ mask.ts
│  │  ├─ response.ts
│  │  └─ logger.ts
│  ├─ abi/
│  │  └─ CertificateRegistry.json
│  ├─ jobs/
│  │  └─ reconcile.ts         # P2
│  ├─ scripts/
│  │  └─ seed.ts
│  └─ types/
├─ test/
├─ Dockerfile
├─ .dockerignore
├─ package.json
├─ tsconfig.json
└─ .env
```

---

## 3. Dependencies

```json
{
  "dependencies": {
    "express": "^4.21",
    "mongoose": "^8",
    "cors": "^2.8",
    "helmet": "^8",
    "morgan": "^1",
    "zod": "^3",
    "jsonwebtoken": "^9",
    "bcryptjs": "^2",
    "multer": "^1",
    "ethers": "^6",
    "dotenv": "^16",
    "express-rate-limit": "^7",
    "file-type": "^19"
  },
  "devDependencies": {
    "typescript": "^5",
    "tsx": "^4",
    "@types/express": "^4",
    "@types/node": "^22",
    "@types/jsonwebtoken": "^9",
    "@types/multer": "^1",
    "jest": "^29",
    "ts-jest": "^29",
    "supertest": "^7",
    "@types/supertest": "^6"
  }
}
```

Scripts:

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "seed": "tsx src/scripts/seed.ts",
  "test": "jest --runInBand",
  "lint": "eslint src"
}
```

---

## 4. API

Base: `/api`

### 4.1 Auth

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/login` | ❌ | `{ email, password }` | `{ token, user }` |
| GET | `/auth/me` | ✅ | — | `{ user }` |

`user`:

```json
{
  "id": "...",
  "email": "issuer@verifycert.local",
  "displayName": "Khoa CNTT",
  "role": "issuer",
  "walletAddress": "0x9b8d..."
}
```

### 4.2 Public

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/public/certificates` | ❌ | Tìm kiếm + phân trang |
| GET | `/public/certificates/recent` | ❌ | Widget 6 chứng chỉ mới nhất |
| GET | `/public/certificates/:id` | ❌ | Chi tiết theo `certificateId` |
| GET | `/public/verify?hash=` | ❌ | Tra theo hash file |
| GET | `/public/filters` | ❌ | Danh sách năm/ngành |

> **Thứ tự route:** `/recent` phải khai báo **trước** `/:id`, nếu không Express sẽ hiểu `recent` là id.

Query của `/public/certificates`:

```
q, year, major, studentCode, status, page=1, limit=10 (max 20), sort=issuedAt:desc
```

### 4.3 Upload

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/uploads` | ✅ issuer | `multipart/form-data` field `file` |

Response:

```json
{
  "success": true,
  "data": {
    "cid": "bafy...",
    "fileHash": "sha256:...",
    "sizeBytes": 245760,
    "mimeType": "application/pdf",
    "filename": "UIT-2024-CS-0001.pdf"
  }
}
```

### 4.4 Certificates (issuer)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/certificates` | ✅ issuer/admin | Danh sách (issuer chỉ thấy của mình) |
| GET | `/certificates/:id` | ✅ | Chi tiết |
| POST | `/certificates` | ✅ issuer | Lưu metadata sau khi tx confirmed |
| POST | `/certificates/:id/revoke` | ✅ | Ghi nhận tx thu hồi sau khi confirmed |

**POST `/certificates` body:**

```json
{
  "certificateId": "UIT-2024-CS-0001",
  "studentName": "Nguyễn Văn An",
  "studentCode": "2311095",
  "major": "Kỹ thuật phần mềm",
  "graduationYear": 2026,
  "gpa": 3.45,
  "classification": "Giỏi",
  "fileHash": "sha256:...",
  "ipfsCid": "bafy...",
  "artifactType": "pdf",
  "mimeType": "application/pdf",
  "filename": "UIT-2024-CS-0001.pdf",
  "sizeBytes": 245760,
  "txHash": "0xabc..."
}
```

**Backend không tin body.** Trước khi lưu phải:

```
1. Kiểm tra tx tồn tại, receipt.status = 1
2. tx.to == CONTRACT_ADDRESS
3. Parse log CertificateIssued
4. Event có certificateId + fileHash khớp body
5. Event.issuer == issuer wallet của user đang đăng nhập
6. certificateId + fileHash chưa tồn tại trong DB
7. Ghi chain_event (unique) rồi upsert certificate
```

### 4.5 Issuers (admin)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/issuers` | ✅ admin | Danh sách |
| POST | `/issuers` | ✅ admin | Lưu issuer sau khi `addIssuer` on-chain |

`POST /issuers` body:

```json
{
  "name": "Khoa Công nghệ Thông tin",
  "code": "CNTT",
  "walletAddress": "0x...",
  "userId": "...",
  "txHash": "0x..."
}
```

Backend xác minh event `IssuerUpdated(wallet, name, true)` trước khi lưu.

### 4.6 Health

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/health` | ❌ | `{ status, db, blockNumber, contract }` |

Dùng cho Render health check và warm-up.

---

## 5. Response format

Thành công:

```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 10, "total": 248 } }
```

Lỗi:

```json
{
  "success": false,
  "error": {
    "code": "CERTIFICATE_NOT_FOUND",
    "message": "Không tìm thấy chứng chỉ"
  }
}
```

Mã lỗi:

| Code | HTTP | Khi nào |
|---|---|---|
| `VALIDATION_ERROR` | 400 | zod fail |
| `UNAUTHORIZED` | 401 | thiếu/sai token |
| `FORBIDDEN` | 403 | sai role |
| `NOT_FOUND` | 404 | route không tồn tại |
| `CERTIFICATE_NOT_FOUND` | 404 | không có cert |
| `CERTIFICATE_EXISTS` | 409 | trùng mã |
| `HASH_EXISTS` | 409 | trùng hash |
| `TX_INVALID` | 422 | receipt fail / event không khớp |
| `UPLOAD_INVALID` | 400 | sai MIME/quá lớn |
| `RATE_LIMITED` | 429 | vượt giới hạn |
| `INTERNAL_ERROR` | 500 | lỗi không lường trước |

---

## 6. Models

Tóm tắt; chi tiết ở [database-schema-design.md](database-schema-design.md).

| Model | Collection | Index chính |
|---|---|---|
| `User` | users | `email` unique, `walletAddress` unique sparse |
| `Issuer` | issuers | `code` unique, `walletAddress` unique |
| `Certificate` | certificates | `certificateId` unique, `fileHash` unique, `txHash` unique sparse |
| `ChainEvent` | chain_events | `{ txHash, logIndex }` unique |
| `SyncState` | sync_state | `key` unique |
| `AuditLog` | audit_logs | `createdAt` |

**Quy ước Mongoose:**

```ts
{ timestamps: true, versionKey: false }
```

`passwordHash` có `select: false`.

`walletAddress` luôn lowercase trước khi lưu:

```ts
schema.pre('save', function () {
  if (this.walletAddress) this.walletAddress = this.walletAddress.toLowerCase();
});
```

Bật `autoIndex` ở dev, tắt ở production và tạo index bằng script.

---

## 7. Auth

### 7.1 Login

```
1. Tìm user theo email lowercase
2. So sánh bcrypt
3. Kiểm tra isActive
4. Ký JWT { sub, role, wallet }, expires 7d
5. Cập nhật lastLoginAt
6. Trả token + user (không có passwordHash)
```

### 7.2 Middleware

```ts
requireAuth   // verify Bearer token, gắn req.user
requireRole('admin' | 'issuer')
```

### 7.3 Quy tắc

- Sai email hoặc mật khẩu → cùng một message “Email hoặc mật khẩu không đúng”.
- Rate limit login: 5 lần/phút/IP.
- Không log token, không log password.
- JWT secret tối thiểu 32 ký tự; kiểm tra lúc khởi động.

### 7.4 P1 — SIWE

`POST /auth/wallet/nonce` + `POST /auth/wallet/verify` để đăng nhập bằng chữ ký ví. Không làm ở v1.

---

## 8. Upload & Pinata

### 8.1 Luồng

```
1. multer memoryStorage, giới hạn 5MB
2. Kiểm tra magic bytes (file-type), không tin Content-Type
3. Chấp nhận: application/pdf, image/png, image/jpeg
4. Tính SHA-256 bằng crypto
5. Nếu client gửi kèm hash → so khớp, lệch thì 400
6. Gửi FormData tới Pinata pinFileToIPFS
7. Trả cid + hash + size + mime
```

### 8.2 Pinata

```ts
const form = new FormData();
form.append('file', new Blob([buffer], { type: mime }), filename);
form.append('pinataMetadata', JSON.stringify({ name: filename }));

const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
  method: 'POST',
  headers: { Authorization: `Bearer ${PINATA_JWT}` },
  body: form,
});
```

**Không** dùng `PINATA_API_KEY`/`SECRET` nếu JWT đã đủ.

### 8.3 Bảo vệ

- Không trả JWT ra response.
- Giới hạn 5MB, chặn file rỗng.
- Timeout 30s khi gọi Pinata.
- Retry 2 lần với backoff.
- Log CID, không log nội dung file.

---

## 9. Xác minh giao dịch on-chain

Đây là phần quan trọng nhất — chống việc client gửi txHash giả.

### 9.1 `verifyIssueTx`

```ts
async function verifyIssueTx(txHash: string, expected: {
  certificateId: string;
  fileHash: string;
  issuerWallet: string;
}) {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) throw new TxInvalid();
  if (receipt.to?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) throw new TxInvalid();

  const logs = receipt.logs
    .filter(l => l.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase())
    .map(l => contract.interface.parseLog(l))
    .filter(l => l?.name === 'CertificateIssued');

  const ev = logs[0];
  if (!ev) throw new TxInvalid();

  const idHash = keccak256(toUtf8Bytes(expected.certificateId));
  if (ev.args.idHash !== idHash) throw new TxInvalid();
  if (ev.args.fileHash !== expected.fileHash) throw new TxInvalid();
  if (ev.args.issuer.toLowerCase() !== expected.issuerWallet.toLowerCase()) throw new TxInvalid();

  return { blockNumber: receipt.blockNumber, logIndex: logs[0].logIndex };
}
```

### 9.2 `verifyRevokeTx`

Tương tự, tìm event `CertificateRevoked` và kiểm tra `idHash`.

### 9.3 Quy tắc

- Chờ **1 confirmation** là đủ với Sepolia.
- Không tin `txHash` do client gửi nếu chưa kiểm tra event.
- Nếu tx đã được xử lý (`chain_events` có bản ghi) → trả kết quả hiện có, không tạo trùng.

---

## 10. Đồng bộ blockchain

### 10.1 Khi khởi động

```
1. Kết nối provider
2. Đọc sync_state.lastSyncedBlock (mặc định = DEPLOY_BLOCK)
3. queryFilter CertificateIssued/CertificateRevoked theo chunk 5.000 block
4. Với mỗi event: insert chain_events (unique) → upsert certificate
5. Cập nhật lastSyncedBlock
6. Đăng ký listener cho block mới
```

### 10.2 Listener

```ts
contract.on('CertificateIssued', async (...args, event) => {
  await handleEvent(event);
});
```

`handleEvent`:

```
1. Insert chain_events với unique { txHash, logIndex }
   - Nếu duplicate → bỏ qua
2. Tìm certificate theo certificateId
   - Nếu có → cập nhật status/issuedAt nếu cần
   - Nếu chưa → tạo placeholder (metadata chưa đầy đủ) hoặc log warning
3. Ghi audit_logs
```

**Placeholder:** chỉ tạo nếu chứng chỉ được cấp ngoài hệ thống. Với demo, mọi cert đều qua app, nên có thể chỉ log warning.

### 10.3 Mất kết nối

- Bắt `error` của provider.
- Reconnect với backoff.
- Khi reconnect: chạy lại backfill từ `lastSyncedBlock`.

### 10.4 Đối soát (P2)

Cron mỗi 10 phút: so `status` trong DB với `contract.isValid(id)`, log lệch.

---

## 11. Tìm kiếm công khai

### 11.1 Chuẩn hóa

```ts
function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
```

Lưu `studentNameNormalized`, `majorNormalized` khi tạo.

### 11.2 Query builder

```
Nếu q:
  - toàn số 6–12 ký tự → ưu tiên studentCode = q
  - khớp pattern mã → ưu tiên certificateId = q
  - còn lại → $text search trên studentNameNormalized + majorNormalized
Nếu year → graduationYear = year
Nếu major → majorNormalized = normalize(major)
Nếu status → status = status
Sort issuedAt desc
Skip/limit
```

### 11.3 DTO

- `/public/certificates`: trả đầy đủ tên + MSSV (theo yêu cầu tra cứu).
- `/public/certificates/recent`: **che** tên/MSSV.
- `/public/certificates/:id`: trả đầy đủ.

### 11.4 Mask

```ts
maskName('Nguyễn Văn An') // 'Nguyễn V. A.'
maskCode('2311095')       // '2311***'
```

---

## 12. Bảo mật

| Lớp | Cấu hình |
|---|---|
| Helmet | bật mặc định |
| CORS | whitelist `localhost:3000` + domain Vercel |
| Body limit | `1mb` (upload đi qua multer riêng) |
| Rate limit | 60 req/phút/IP toàn cục; 30 req/phút cho public; 5/phút login |
| Validation | zod cho body, query, params |
| Mongo injection | zod + không nhận object lạ |
| JWT | HS256, secret ≥ 32 ký tự |
| Password | bcrypt cost 10–12 |
| Log | không log token, password, JWT Pinata |
| Error | production không trả stack |
| Proxy | `app.set('trust proxy', 1)` cho Render |
| Env | `.env` không commit; validate khi start |

---

## 13. Kiểm thử

### 13.1 Unit

| Test | Mô tả |
|---|---|
| `hash.test.ts` | SHA-256 đúng format `sha256:<hex>` |
| `normalize.test.ts` | bỏ dấu tiếng Việt, đ→d |
| `mask.test.ts` | che tên/MSSV |
| `validators.test.ts` | GPA 0–4, mã cert, MSSV |

### 13.2 Integration (Supertest)

| # | Case | Kỳ vọng |
|---|---|---|
| I01 | Login đúng | 200 + token |
| I02 | Login sai | 401, message chung |
| I03 | `/certificates` không token | 401 |
| I04 | Issuer gọi admin route | 403 |
| I05 | Upload sai MIME | 400 |
| I06 | Upload quá 5MB | 400 |
| I07 | POST cert với txHash giả | 422 |
| I08 | POST cert trùng id | 409 |
| I09 | Public search theo MSSV | đúng 1 kết quả |
| I10 | Public search theo tên có dấu/không dấu | cùng kết quả |
| I11 | Recent trả masked | không có tên đầy đủ |
| I12 | Verify hash không tồn tại | `exists=false` |
| I13 | Revoke sai issuer | 422/403 |
| I14 | Health | 200, db ok |

### 13.3 Chạy

```bash
npm test
```

Dùng `mongodb-memory-server` hoặc DB test riêng. Không chạy test trên DB demo.

---

## 14. Deploy Render

Đã có `Dockerfile`, `render.yaml`.

Checklist:

- [ ] `npm run build` pass local
- [ ] `package-lock.json` đã commit
- [ ] Env đủ: `MONGODB_URI`, `JWT_SECRET`, `PINATA_JWT`, `SEPOLIA_RPC_URL`, `CONTRACT_ADDRESS`, `DEPLOY_BLOCK`, `FRONTEND_ORIGIN`
- [ ] Không set `PORT`
- [ ] Health check `/api/health`
- [ ] Atlas Network Access cho phép Render
- [ ] CORS đúng domain Vercel
- [ ] Log không lộ secret
- [ ] Seed chạy một lần trên DB thật

---

## 15. Lộ trình 8 ngày

| Ngày | Việc | Kết quả |
|---|---|---|
| 1 | Skeleton Express + env + Mongo + Docker | `/api/health` chạy, Render build xanh |
| 2 | Models + index + seed admin/issuer | Đăng nhập được |
| 3 | Auth + middleware + rate limit | API auth hoàn chỉnh |
| 4 | Upload Pinata + hash + magic bytes | Upload PDF trả CID |
| 5 | POST certificate + verify tx + duplicate | Cấp chứng chỉ qua API |
| 6 | Public search + recent + verify + filters | Trang công khai có dữ liệu |
| 7 | Revoke + chain listener + backfill | Trạng thái đồng bộ |
| 8 | Test, bảo mật, deploy, README | Backend production |

---

## 16. Rủi ro

| Rủi ro | Ảnh hưởng | Xử lý |
|---|---|---|
| Render cold start | Request đầu 30–60s | UptimeRobot ping `/api/health` |
| Atlas DNS/connection | Không start được | Retry + log rõ |
| Pinata 1GB | Hết chỗ | Chỉ PDF, giới hạn 5MB |
| RPC rate limit | Sync lỗi | Backoff, chunk nhỏ |
| Event listener rớt | DB chậm cập nhật | Reconnect + backfill |
| txHash giả | Dữ liệu sai | Verify receipt + event |
| Trùng event | Cấp 2 lần | Unique `txHash+logIndex` |
| CORS sai | Frontend gọi fail | Set đúng `FRONTEND_ORIGIN` |
| JWT lộ | Chiếm tài khoản | HTTPS, không log, hết hạn 7d |
| Docker build OOM | Deploy fail | `npm ci --include=dev`, image alpine |

---

## 17. Definition of Done

- [ ] `/api/health` trả DB + block number
- [ ] Login + phân quyền admin/issuer
- [ ] Upload PDF → CID + hash
- [ ] POST certificate chỉ thành công khi tx hợp lệ
- [ ] Public search 4 tiêu chí + phân trang
- [ ] Recent widget trả masked
- [ ] Verify theo hash đọc chain
- [ ] Revoke cập nhật đúng
- [ ] Listener + backfill idempotent
- [ ] Không lộ secret trong repo/log
- [ ] Deploy Render xanh, CORS đúng
- [ ] README hướng dẫn chạy + seed
