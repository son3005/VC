# Deploy bằng Remix — Hướng dẫn

> Dành cho đồ án Verify Certification · Sepolia · MetaMask
>
> Ưu điểm: không cần đưa private key vào máy/CI, ký trực tiếp bằng MetaMask.
>
> Hạn chế: không có test tự động, không phù hợp CI/CD. Vẫn nên dùng Hardhat cho test.

---

## 1. Khi nào dùng Remix?

| Tình huống | Remix | Hardhat |
|---|---|---|
| Deploy nhanh lên Sepolia | ✅ | ✅ |
| Không muốn lưu private key | ✅ | ❌ |
| Test tự động 30 case | ❌ | ✅ |
| CI/CD | ❌ | ✅ |
| Chạy local node | ❌ | ✅ |
| Verify Etherscan | ✅ thủ công | ✅ tự động |

**Khuyến nghị:** viết và test bằng Hardhat, deploy bằng Remix.

---

## 2. Chuẩn bị

- [ ] MetaMask kết nối Sepolia
- [ ] Ví có ≥ 0.1 SepoliaETH
- [ ] Source contract hoàn chỉnh, không import phức tạp
- [ ] Đã chạy test local (Hardhat) — không deploy code chưa test

---

## 2.1 Kéo repo GitHub vào Remix

Remix có **Git plugin** tích hợp, dùng được trực tiếp trên web.

### Cách A — Clone repo bằng Git plugin (khuyến nghị)

1. Push code contract lên GitHub trước.
2. Mở https://remix.ethereum.org
3. Bấm **Login with GitHub** trên thanh trên cùng → authorize.
4. Mở **Git plugin** (icon nhánh cây ở thanh trái).
5. Mở mục **CLONE**:
   - Chọn **Clone from URL**
   - Nhập: `https://github.com/son3005/VC.git`
   - Branch: `main`
   - Depth: `1` (bắt buộc với repo lớn)
6. Bấm **Clone**.

Remix tạo một **workspace mới** là bản clone repo. Contract nằm ở:

```
contracts/contracts/CertificateRegistry.sol
```

### Cách B — remixd (dùng repo local)

Nếu repo lớn hoặc muốn sửa file local bằng VS Code:

```bash
npx @remix-project/remixd \
  -s "E:\University\Year 4 - 1\BlockChain" \
  --remix-ide https://remix.ethereum.org
```

Sau đó trong Remix:

- File Explorer → **Connect to localhost**
- Chọn workspace local

Remix đọc/ghi trực tiếp file trên máy. Git vẫn dùng VS Code/CLI.

### Quy tắc dùng chung

| Việc | Làm ở đâu |
|---|---|
| Source of truth | GitHub `main` |
| Sửa contract | VS Code hoặc Remix, nhưng **một nơi tại một thời điểm** |
| Trước khi sửa | `git pull` |
| Sau khi sửa | Commit + push |
| Trước khi deploy | Pull, compile, kiểm tra đúng commit |

**Tránh:** sửa ở Remix mà không push, rồi sửa tiếp ở VS Code — sẽ lệch file.

### Giới hạn cần biết

- Remix web lưu file trong **browser storage**, dung lượng hạn chế.
- Clone repo lớn dễ treo IDE → luôn đặt **depth = 1**.
- `node_modules` không được clone (đã gitignore), nên không nặng.
- Repo có nhiều module vẫn clone được, nhưng nên mở đúng file contract.
- Remix Git plugin hỗ trợ: `push`, `push --force`, `fetch`, `pull`.
- Không hỗ trợ toàn bộ Git CLI; thao tác phức tạp nên làm ở VS Code.

---

## 3. Cấu hình compiler trong Remix

Mở **Solidity Compiler**:

| Mục | Giá trị |
|---|---|
| Compiler | `0.8.24` |
| Language | Solidity |
| EVM Version | `shanghai` |
| Enable optimization | ✅ |
| Runs | `200` |

**Phải khớp với `hardhat.config.ts`.** Lệch một mục là verify Etherscan sẽ fail.

---

## 4. Deploy

1. Mở https://remix.ethereum.org
2. Tạo file `CertificateRegistry.sol`, dán source.
3. **Solidity Compiler → Compile**.
4. Chuyển **Deploy & Run Transactions**:
   - Environment: **Injected Provider — MetaMask**
   - Account: ví `0x9b8D...1b3B`
   - Contract: `CertificateRegistry`
5. Kiểm tra MetaMask đang ở **Sepolia**.
6. Bấm **Deploy** (không có constructor args).
7. MetaMask mở → Confirm.
8. Chờ tx confirmed.

**Sau khi deploy:**

- Copy **contract address**.
- Mở Etherscan, tìm tx deploy, ghi lại **block number**.

```
CONTRACT_ADDRESS=0x......
DEPLOY_BLOCK=11948000
```

---

## 5. Thêm issuer đầu tiên

Trong Remix, phần **Deployed Contracts**:

1. Mở contract vừa deploy.
2. Tìm hàm `addIssuer`.
3. Nhập:
   - `who`: `0x9b8DF93f172AAEB67C31be257C9E4a55a8df1b3B`
   - `name`: `Khoa Công nghệ Thông tin`
4. Bấm **transact** → MetaMask confirm.

**Kiểm tra:**

- Gọi `getIssuer(0x9b8D...)` → `active = true`.
- Gọi `owner()` → đúng ví deploy.

> Nếu `addIssuer` revert `NotOwner`: ví đang dùng không phải ví deploy.
> Nếu revert `ZeroAddress`: nhập sai địa chỉ.
> Nếu revert `IssuerAlreadyActive`: đã thêm trước đó.

---

## 6. Verify trên Etherscan

### Cách 1 — Verify thủ công

1. Mở `https://sepolia.etherscan.io/address/<CONTRACT_ADDRESS>`
2. Tab **Contract** → **Verify and Publish**
3. Chọn:
   - Compiler Type: **Solidity (Single file)**
   - Compiler Version: **v0.8.24+commit...**
   - Open Source License: **MIT** hoặc **GPL-3.0** (khớp SPDX)
   - Optimization: **Yes**, Runs **200**
4. Dán source code (nếu có import, dùng **Flatten** hoặc chọn Multi-file).
5. Submit.

### Cách 2 — Remix plugin

- Cài plugin **Etherscan** trong Remix.
- Nhập API key.
- Chọn contract đã deploy → Verify.

### Lỗi thường gặp

| Lỗi | Nguyên nhân |
|---|---|
| `Compiler version mismatch` | Remix khác Etherscan chọn |
| `Optimization settings mismatch` | Runs khác 200 |
| `EVM version mismatch` | Chọn shanghai/cancun khác nhau |
| `Bytecode does not match` | Sửa source sau khi deploy |
| `License mismatch` | SPDX khác license chọn |

---

## 7. Xuất ABI

Remix → **Solidity Compiler** → **Compilation Details** → copy **ABI**.

Lưu vào:

```
shared/abi/CertificateRegistry.json
backend/src/abi/CertificateRegistry.json
```

Hoặc tải artifact JSON từ Remix.

**Kiểm tra ABI có:**

- `issueCertificate`
- `revokeCertificate`
- `getCertificate`
- `verifyByHash`
- `addIssuer`
- event `CertificateIssued`, `CertificateRevoked`

---

## 8. Cập nhật môi trường

**Backend (Render):**

```
CONTRACT_ADDRESS=0x......
DEPLOY_BLOCK=11948000
```

**Frontend (Vercel):**

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x......
NEXT_PUBLIC_DEPLOY_BLOCK=11948000
```

Redeploy cả hai sau khi đổi env.

---

## 9. Test vẫn nên dùng Hardhat

Remix không thay thế test tự động. Giữ `contracts/` với Hardhat để:

```bash
npx hardhat test
npx hardhat coverage
```

CI trên GitHub chạy Hardhat test; deploy vẫn thủ công bằng Remix.

**Nếu không muốn cài Hardhat:**

- Dùng plugin **Solidity Unit Testing** trong Remix.
- Viết test bằng Solidity, chạy trong Remix.
- Nhược điểm: khó viết 30 case, không chạy CI.

---

## 10. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| Deploy nhầm mạng | Kiểm tra chainId 11155111 trước khi bấm |
| Deploy nhầm contract | Kiểm tra tên contract trong dropdown |
| Quên ghi address | Copy ngay vào `.env` |
| Quên `addIssuer` | Gọi lại, kiểm tra `getIssuer` |
| Verify fail | So compiler/optimizer/EVM với Remix |
| Sửa source sau deploy | Không sửa; deploy mới nếu cần |
| Mất private key | Không cần key khi dùng Remix, chỉ cần MetaMask |

---

## 11. Checklist

- [ ] Compiler 0.8.24, optimizer 200, EVM shanghai
- [ ] MetaMask đúng Sepolia
- [ ] Deploy thành công, có address
- [ ] Ghi `DEPLOY_BLOCK`
- [ ] `addIssuer` thành công
- [ ] `getIssuer` trả active
- [ ] Verify Etherscan
- [ ] ABI lưu vào `shared/abi/`
- [ ] Env backend + frontend cập nhật
- [ ] Redeploy backend + frontend
- [ ] Test `issueCertificate` từ Remix
- [ ] Test `verifyByHash` từ Remix
- [ ] Ảnh chụp Etherscan lưu làm minh chứng
