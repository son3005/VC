# Deployment Runbook — Verify Certification

> Quy trình deploy **một lần, đúng thứ tự**, cho: Contract → Render → Vercel → CORS → Smoke test.
>
> Mỗi bước có điều kiện qua rõ ràng. Không nhảy bước.

---

## 1. Topology

```
Người dùng
   │
   ▼
Vercel (Next.js)  ──── HTTPS ────►  Render (Express/Docker)
   │                                    │
   │ ethers + MetaMask                  │ Mongoose
   ▼                                    ▼
Sepolia Contract  ◄── RPC ────  Infura   MongoDB Atlas
   │                                    │
   └── IPFS (Pinata) ───────────────────┘
```

| Thành phần | Nền tảng | Gói |
|---|---|---|
| Frontend | Vercel | Hobby |
| Backend | Render | Free Web Service (Docker) |
| Database | MongoDB Atlas | M0 |
| IPFS | Pinata | Free 1GB |
| RPC | Infura | Free |
| Contract | Sepolia | Testnet |
| Verify | Etherscan Sepolia | Free |

---

## 2. Môi trường

| Môi trường | Frontend | Backend | Contract | DB |
|---|---|---|---|---|
| Local | `localhost:3000` | `localhost:4000` | Hardhat / Sepolia | Atlas test |
| Preview | `*.vercel.app` | Render staging (nếu có) | Sepolia | Atlas test |
| Production | `vc-frontend.vercel.app` | `vc-api.onrender.com` | Sepolia | Atlas `verify_cert` |

Đồ án chỉ cần **Local + Production**. Preview dùng cho nhánh feature.

---

## 3. Ma trận biến môi trường

### 3.1 Contract (`contracts/.env`)

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `SEPOLIA_RPC_URL` | ✅ | Infura |
| `ETHERSCAN_API_KEY` | ✅ | verify |
| `DEPLOYER_PRIVATE_KEY` | ✅ | chỉ local, không commit |
| `OWNER_ADDRESS` | ✅ | ví deploy |
| `INITIAL_ISSUER_ADDRESS` | ✅ | ví khoa |

### 3.2 Backend (Render → Environment)

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `NODE_ENV` | ✅ | `production` |
| `CHAIN_ID` | ✅ | `11155111` |
| `SEPOLIA_RPC_URL` | ✅ | Infura |
| `CONTRACT_ADDRESS` | ✅ | sau deploy |
| `DEPLOY_BLOCK` | ✅ | block deploy |
| `MONGODB_URI` | ✅ | Atlas |
| `MONGODB_DB` | ✅ | `verify_cert` |
| `JWT_SECRET` | ✅ | ≥ 32 ký tự |
| `JWT_EXPIRES_IN` | ✅ | `7d` |
| `PINATA_JWT` | ✅ | |
| `PINATA_GATEWAY` | ✅ | |
| `MAX_FILE_SIZE_MB` | ✅ | `5` |
| `FRONTEND_ORIGIN` | ✅ | domain Vercel, không `/` cuối |
| `LOG_LEVEL` | 🟡 | `info` |

**Không đặt trên Render:**

- `PORT` — Render tự inject
- `NODE_VERSION` — Docker đã pin
- `SEED_*` — chỉ chạy local
- `MONGODB_USER/PASS` — đã nằm trong URI

### 3.3 Frontend (Vercel → Environment)

| Biến | Bắt buộc |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | ✅ |
| `NEXT_PUBLIC_CHAIN_ID_HEX` | ✅ |
| `NEXT_PUBLIC_CHAIN_NAME` | ✅ |
| `NEXT_PUBLIC_RPC_URL` | ✅ |
| `NEXT_PUBLIC_EXPLORER_URL` | ✅ |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | ✅ |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | ✅ |
| `NEXT_PUBLIC_API_URL` | ✅ |
| `NEXT_PUBLIC_IPFS_GATEWAY` | ✅ |

**Tuyệt đối không đặt trên Vercel:**

- `PINATA_JWT`
- `MONGODB_URI`
- `JWT_SECRET`
- `SEPOLIA_RPC_URL` (bản có key)

---

## 4. Trước khi deploy

### 4.1 Checklist code

- [ ] `contracts`: `npx hardhat test` pass
- [ ] `backend`: `npm run build` pass
- [ ] `frontend`: `npm run build` pass
- [ ] Không có `console.log` nhạy cảm
- [ ] `git status` sạch, không có `.env`
- [ ] `package-lock.json` đã commit
- [ ] Dockerfile build được local

### 4.2 Checklist hạ tầng

- [ ] Ví deploy còn ≥ 0.2 SepoliaETH
- [ ] Atlas cluster Active
- [ ] Atlas Network Access cho phép `0.0.0.0/0` (demo)
- [ ] Pinata JWT còn hạn
- [ ] Infura project hoạt động
- [ ] Etherscan API key hợp lệ

### 4.3 Backup

```bash
# Backup DB trước khi deploy lớn
mongodump --uri="<MONGODB_URI>" --out=backup-$(date +%F)
```

Nếu không có `mongodump`, export từng collection bằng MongoDB Compass.

---

## 5. Thứ tự deploy

```
① Contract
   ↓ address + ABI + block
② Backend (Render)
   ↓ URL
③ Frontend (Vercel)
   ↓ URL
④ Cập nhật CORS backend
   ↓ redeploy backend
⑤ Smoke test
```

### Bước 1 — Deploy contract

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network sepolia
```

Ghi lại:

```
Address:      0x......
Deploy block: 11948000
Tx hash:      0x......
```

Thêm issuer đầu tiên:

```bash
npx hardhat run scripts/add-issuer.ts --network sepolia
```

Verify:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

Nếu lỗi V1 deprecated: cấu hình `apiURL: https://api.etherscan.io/v2/api` hoặc verify thủ công.

**Điều kiện qua:**

- [ ] Contract verified trên Sepolia Etherscan
- [ ] `addIssuer` thành công
- [ ] Đọc `totalCertificates()` = 0
- [ ] `deployments/sepolia.json` đã ghi

### Bước 2 — Deploy backend

Cập nhật env Render:

```
CONTRACT_ADDRESS=0x......
DEPLOY_BLOCK=11948000
```

Deploy:

- Nếu dùng Blueprint: push `render.yaml` → Render tự sync.
- Nếu thủ công: **Manual Deploy → Deploy latest commit**.

Theo dõi log:

```
Building image...
npm ci --include=dev
npm run build
Starting service...
Listening on 10000
```

**Điều kiện qua:**

```bash
curl -s https://vc-api.onrender.com/api/health
```

```json
{"success":true,"data":{"status":"ok","db":"connected","blockNumber":11948000}}
```

Nếu fail: xem mục 11.

### Bước 3 — Deploy frontend

Cập nhật env Vercel:

```
NEXT_PUBLIC_API_URL=https://vc-api.onrender.com
NEXT_PUBLIC_CONTRACT_ADDRESS=0x......
NEXT_PUBLIC_DEPLOY_BLOCK=11948000
```

Deploy:

- Push `main` → Vercel tự build.
- Hoặc **Deployments → Redeploy**.

**Lưu ý:** `NEXT_PUBLIC_*` chỉ có hiệu lực sau khi **build lại**. Sửa env mà không redeploy là vô nghĩa.

**Điều kiện qua:**

- [ ] `https://vc-frontend.vercel.app` mở được
- [ ] Console không lỗi CORS
- [ ] Kết nối MetaMask được

### Bước 4 — Cập nhật CORS

Lấy domain Vercel thật, cập nhật Render:

```
FRONTEND_ORIGIN=https://vc-frontend.vercel.app
```

Redeploy backend (Manual Deploy).

**Điều kiện qua:**

```bash
curl -i -X OPTIONS https://vc-api.onrender.com/api/auth/login \
  -H "Origin: https://vc-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

Phải có `Access-Control-Allow-Origin` đúng domain, không phải `*`.

### Bước 5 — Smoke test

Xem mục 8.

---

## 6. Render — cấu hình chuẩn

| Mục | Giá trị |
|---|---|
| Type | Web Service |
| Language | Docker |
| Branch | `main` |
| Region | Singapore |
| Root Directory | **để trống** |
| Dockerfile Path | `backend/Dockerfile` |
| Docker Context | `backend` |
| Instance | Free |
| Health Check | `/api/health` |
| Auto-Deploy | On Commit |

**Không set `PORT`.** App đọc `process.env.PORT`, Render inject `10000`.

Nếu dùng `render.yaml`, kiểm tra:

```yaml
runtime: docker
dockerfilePath: ./backend/Dockerfile
dockerContext: ./backend
healthCheckPath: /api/health
```

---

## 7. Vercel — cấu hình chuẩn

| Mục | Giá trị |
|---|---|
| Root Directory | `frontend` |
| Framework | Next.js |
| Build Command | mặc định |
| Output Directory | mặc định `.next` |
| Install Command | mặc định |
| Node.js | 24.x |
| Production Branch | `main` |

**Không override Output Directory thành `public`.**

Mỗi nhánh feature có Preview URL — dùng để test trước khi merge.

---

## 8. Smoke test sau deploy

### 8.1 API

```bash
# Health
curl -s https://vc-api.onrender.com/api/health

# Login
curl -s -X POST https://vc-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"issuer@verifycert.local","password":"Issuer@123456"}'

# Public search
curl -s "https://vc-api.onrender.com/api/public/certificates?studentCode=2311095"

# Recent
curl -s "https://vc-api.onrender.com/api/public/certificates/recent?limit=6"

# Verify hash
curl -s "https://vc-api.onrender.com/api/public/verify?hash=sha256:..."
```

### 8.2 UI

- [ ] Landing mở, search bar hoạt động
- [ ] `/search` tìm theo MSSV ra kết quả
- [ ] `/c/UIT-2024-CS-0001` mở đúng
- [ ] `/verify` upload PDF → ✅
- [ ] Upload file sửa → ⚠️
- [ ] Cert revoked → ❌
- [ ] Recent widget hiện masked
- [ ] Login issuer → dashboard
- [ ] MetaMask đúng Sepolia
- [ ] Cấp thử 1 chứng chỉ
- [ ] Revoke thử chứng chỉ đó

---

## 9. Rollback

### 9.1 Frontend

Vercel → **Deployments** → chọn bản trước → **Promote to Production**.

Thời gian: vài giây. Không cần build lại.

### 9.2 Backend

Render → **Deploys** → chọn bản trước → **Rollback**.

Hoặc revert commit rồi push.

**Lưu ý:** rollback code không rollback DB. Nếu migration đã chạy, phải xử lý riêng.

### 9.3 Biến môi trường

Đổi env → redeploy. Không có rollback tự động cho env; ghi lại giá trị cũ trước khi sửa.

### 9.4 Database

```bash
mongorestore --uri="<MONGODB_URI>" backup-2026-10-19/
```

Rủi ro: mất dữ liệu phát sinh sau backup.

### 9.5 Contract

**Không rollback được.** Contract bất biến.

Nếu contract lỗi nghiêm trọng:

1. Deploy contract mới.
2. Cập nhật `CONTRACT_ADDRESS` ở backend + frontend.
3. Redeploy cả hai.
4. Chứng chỉ cũ **không** tự chuyển sang contract mới — phải re-issue nếu cần.

Đây là lý do phải test kỹ trước khi deploy.

---

## 10. Sự cố thường gặp

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| Render build fail `package.json not found` | Sai context / thiếu code | Kiểm tra Docker Context = `backend` |
| `npm ci` fail | Thiếu `package-lock.json` | Commit lock |
| Deploy xanh nhưng 502 | App không listen `0.0.0.0` hoặc sai PORT | Đọc `process.env.PORT`, không hardcode |
| Health check fail | Thiếu `/api/health` | Thêm route |
| CORS error | `FRONTEND_ORIGIN` sai | Cập nhật đúng origin, không `/` cuối |
| `MongoServerSelectionError` | Atlas chặn IP | Network Access `0.0.0.0/0` |
| `401` Pinata | JWT hết hạn | Tạo JWT mới |
| `CALL_EXCEPTION` | Sai contract address/chain | Kiểm tra env + chainId |
| Verify sai kết quả | ABI cũ | Copy lại ABI từ artifact |
| Frontend trắng | Thiếu `NEXT_PUBLIC_*` lúc build | Set env → redeploy |
| MetaMask không hiện | Sai mạng | Switch Sepolia |
| Etherscan verify lỗi | API V1 deprecated | Dùng V2 hoặc verify tay |
| Render cold start | Free tier ngủ | Ping trước demo |

---

## 11. Giám sát

| Kênh | Theo dõi |
|---|---|
| Render Logs | lỗi 5xx, crash, restart |
| Render Metrics | CPU, RAM |
| Vercel Logs | build fail, function error |
| Atlas Metrics | connections, slow query |
| UptimeRobot | `/api/health` mỗi 5 phút |
| Etherscan | tx bất thường |

**Ping giữ ấm:**

```
https://uptimerobot.com → HTTP(s) monitor
URL: https://vc-api.onrender.com/api/health
Interval: 5 phút
```

Free tier Render ngủ sau 15 phút; ping 5 phút giữ service thức.

---

## 12. Bảo mật vận hành

### 12.1 Không bao giờ

- Commit `.env`
- Đặt private key trên Render/Vercel
- Đặt `PINATA_JWT` ở frontend
- Log token/password
- Dùng `CORS origin: *` ở production

### 12.2 Sau khi bảo vệ — rotate

Các key đã từng xuất hiện trong chat/tài liệu:

- [ ] Pinata JWT
- [ ] Etherscan API key
- [ ] MongoDB password
- [ ] JWT secret

### 12.3 Nếu lộ key

| Key | Hành động |
|---|---|
| Pinata | Revoke key, tạo JWT mới, cập nhật Render |
| Etherscan | Revoke, tạo key mới |
| Mongo | Đổi password, cập nhật URI |
| JWT | Đổi secret, tất cả user đăng nhập lại |
| Private key ví | Chuyển tiền sang ví mới ngay |

---

## 13. Demo day runbook

### T-1 ngày

- [ ] Freeze code
- [ ] Backup DB
- [ ] Quay video demo 5 phút
- [ ] Chụp ảnh Etherscan contract + 2 tx
- [ ] Kiểm tra ví còn ≥ 0.2 ETH
- [ ] Chuẩn bị file `valid.pdf`, `tampered.pdf`
- [ ] Slide hoàn chỉnh

### T-1 giờ

- [ ] Ping `/api/health` 3 lần
- [ ] Mở sẵn 6 tab:
  1. Landing
  2. `/search`
  3. `/c/UIT-2024-CS-0001`
  4. Etherscan contract
  5. Etherscan tx issue
  6. Video dự phòng
- [ ] MetaMask đúng Sepolia, đúng tài khoản
- [ ] Clear cache trình duyệt
- [ ] Tắt extension lạ
- [ ] Sạc pin, tắt thông báo

### Trong lúc demo

1. Giới thiệu vấn đề (30s)
2. Tra cứu có sẵn (1 phút)
3. Verify file đúng (1 phút)
4. Verify file sửa (1 phút)
5. Cấp chứng chỉ mới (2 phút)
6. Revoke (1 phút)
7. Kiến trúc + kết luận (1 phút)

### Nếu sự cố

| Sự cố | Xử lý |
|---|---|
| Backend chậm | Nói “đang khởi động”, chờ 30s |
| MetaMask lỗi | Dùng video dự phòng |
| Mạng hỏng | Phát video, thuyết minh |
| Tx treo | Mở Etherscan, giải thích pending |
| Sai mạng | Switch ngay, tiếp tục |

---

## 14. Chi phí

| Dịch vụ | Gói | Chi phí |
|---|---|---|
| Sepolia ETH | Faucet | 0đ |
| Infura | Free | 0đ |
| Pinata | Free 1GB | 0đ |
| MongoDB Atlas | M0 | 0đ |
| Render | Free | 0đ |
| Vercel | Hobby | 0đ |
| Etherscan | Free | 0đ |
| **Tổng** | | **0đ** |

---

## 15. Checklist tổng

### Trước deploy

- [ ] Contract test pass
- [ ] Backend build pass
- [ ] Frontend build pass
- [ ] Env đầy đủ
- [ ] Backup DB
- [ ] Ví đủ ETH

### Deploy

- [ ] Contract verified
- [ ] `addIssuer` thành công
- [ ] Backend health 200
- [ ] Frontend mở được
- [ ] CORS đúng
- [ ] Smoke test pass

### Sau deploy

- [ ] Tx issue trên Etherscan
- [ ] Verify 3 trạng thái
- [ ] Recent widget masked
- [ ] Search 4 tiêu chí
- [ ] Admin thêm issuer
- [ ] Video dự phòng
