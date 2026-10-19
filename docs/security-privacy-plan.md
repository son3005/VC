# Security & Privacy Plan — Verify Certification

> Phạm vi: đồ án môn học trên **Sepolia testnet**. Không phải hệ thống production, không có giá trị pháp lý.
>
> Mục tiêu: không lộ secret, không để người ngoài cấp/Thu hồi chứng chỉ, không làm sai lệch dữ liệu xác thực, và xử lý PII có ý thức.

---

## 1. Tài sản cần bảo vệ

| # | Tài sản | Mức quan trọng | Nếu mất/bị sửa |
|---|---|---|---|
| 1 | Private key ví deploy/issuer | 🔴 Critical | Mất quyền cấp, có thể bị chiếm ví |
| 2 | JWT secret | 🔴 Critical | Giả mạo phiên đăng nhập |
| 3 | Pinata JWT | 🟠 High | Người khác upload/xóa IPFS |
| 4 | MongoDB URI + password | 🔴 Critical | Lộ toàn bộ PII |
| 5 | Dữ liệu chứng chỉ (hash, CID, status) | 🔴 Critical | Sai lệch xác thực |
| 6 | PII sinh viên (tên, MSSV, GPA) | 🟠 High | Vi phạm riêng tư |
| 7 | Tài khoản GitHub/Vercel/Render/Atlas | 🟠 High | Chiếm quyền deploy, sửa code |
| 8 | Etherscan/Infura key | 🟡 Medium | Verify lỗi, hết quota |
| 9 | Audit log | 🟡 Medium | Mất dấu vết thao tác |
| 10 | Uy tín website | 🟠 High | Phishing, giả mạo |

---

## 2. Phân loại dữ liệu

| Mức | Dữ liệu | Nơi lưu | Ai được xem |
|---|---|---|---|
| **Công khai** | certificateId, fileHash, CID, issuer wallet, issuedAt, status | Chain + API | Tất cả |
| **Công khai theo yêu cầu** | Họ tên, MSSV, ngành, năm, GPA | MongoDB + API public | Tất cả |
| **Nội bộ** | Email, role, audit log, IP | MongoDB | Admin |
| **Bí mật** | Password hash, JWT secret, Pinata JWT, Mongo URI, private key | Env / local | Chỉ người vận hành |
| **Hạn chế** | Log chi tiết, backup | Render/Atlas | Chỉ admin |

**Quyết định có chủ đích:** tên + MSSV công khai để phục vụ tra cứu. Đã ghi rõ trong báo cáo; widget “cấp gần đây” che bớt.

---

## 3. Threat model — STRIDE

| Mối đe dọa | Ví dụ trong dự án | Kiểm soát |
|---|---|---|
| **Spoofing** | Kẻ gian dùng ví giả gọi `issueCertificate` | `onlyIssuer` + whitelist on-chain |
| | Giả mạo JWT để gọi API admin | JWT HS256 + secret mạnh |
| | Website giả mạo trang verify | Domain chính thức, QR in trên PDF |
| **Tampering** | Sửa metadata trong Mongo | Chain giữ hash; đối soát định kỳ |
| | Sửa file PDF | Hash khác → verify fail |
| | Gửi `txHash` giả khi lưu cert | Backend verify receipt + event |
| | Sửa ABI/address ở frontend | Env cố định, review build |
| **Repudiation** | Issuer phủ nhận đã cấp bằng | Event + tx trên chain |
| | Admin phủ nhận đã thêm issuer | Event `IssuerUpdated` |
| **Information disclosure** | Lộ `.env` qua Git | `.gitignore`, secret scan |
| | API trả stack trace | Error handler production |
| | Log chứa token/password | Redaction |
| | Pinata JWT lộ ở frontend | Chỉ backend giữ |
| **Denial of service** | Spam upload làm đầy Pinata | Rate limit + 5MB + auth |
| | Spam search | Rate limit 30/phút/IP |
| | Gas griefing bằng string dài | Giới hạn độ dài on-chain |
| **Elevation of privilege** | Issuer gọi API admin | `requireRole` |
| | Issuer A revoke cert của B | Kiểm tra `cert.issuer` |
| | Sửa body để cấp cert cho ví khác | So `event.issuer` với user |

---

## 4. Risk register

| ID | Rủi ro | Khả năng | Tác động | Mức | Giảm thiểu |
|---|---|---|---|---|---|
| R-01 | Lộ private key ví | Thấp | Critical | 🔴 | Ví test riêng, không commit, không gửi chat |
| R-02 | Lộ JWT secret | Thấp | Critical | 🔴 | Env Render, rotate khi nghi ngờ |
| R-03 | Lộ Mongo URI | Thấp | Critical | 🔴 | Env, IP allowlist, rotate password |
| R-04 | Client gửi txHash giả | Cao | High | 🟠 | Verify receipt + event + issuer |
| R-05 | Trùng chứng chỉ do retry | Trung bình | Medium | 🟡 | Unique index + idempotent |
| R-06 | Issuer A sửa cert của B | Trung bình | High | 🟠 | Kiểm tra quyền ở API + contract |
| R-07 | Upload file độc hại | Trung bình | Medium | 🟡 | Magic bytes, size, MIME, không thực thi |
| R-08 | Scrape danh sách sinh viên | Cao | Medium | 🟡 | Rate limit, limit 20, không export |
| R-09 | Lộ PII qua log | Trung bình | High | 🟠 | Redaction, không log body |
| R-10 | Owner lạm quyền revoke | Thấp | Medium | 🟡 | Ghi rõ trong báo cáo, multisig P2 |
| R-11 | Contract bug không sửa được | Thấp | High | 🟠 | Test kỹ, không upgradeable |
| R-12 | RPC/Pinata outages | Trung bình | Medium | 🟡 | Retry, fallback, thông báo |
| R-13 | Tài khoản Render/Vercel bị chiếm | Thấp | High | 🟠 | 2FA, mật khẩu mạnh |
| R-14 | Phishing bằng site giả | Trung bình | High | 🟠 | QR domain chính thức, hướng dẫn |
| R-15 | Dependency có lỗ hổng | Trung bình | Medium | 🟡 | `npm audit`, lockfile |

---

## 5. Bảo mật Smart Contract

### 5.1 Kiểm soát quyền

| Hàm | Quyền | Kiểm tra |
|---|---|---|
| `addIssuer` / `removeIssuer` | owner | `onlyOwner` |
| `issueCertificate` | issuer active | `onlyActiveIssuer` |
| `revokeCertificate` | issuer của cert hoặc owner | so `cert.issuer` |
| Hàm đọc | anyone | không thay đổi state |

### 5.2 Các lỗi đã loại bỏ

| Lỗi | Có xảy ra? | Lý do |
|---|---|---|
| Reentrancy | ❌ | Không có external call |
| Integer overflow | ❌ | Solidity 0.8 tự check |
| Delegatecall | ❌ | Không dùng proxy |
| Self-destruct | ❌ | Không dùng |
| Front-running cấp cert | 🟡 | Chỉ issuer được gọi; không có lợi ích kinh tế |
| Gas griefing | ✅ | Giới hạn độ dài string |
| Duplicate ID/hash | ✅ | Kiểm tra trước khi ghi |

### 5.3 Tập trung quyền

- Owner có thể revoke mọi chứng chỉ.
- Owner có thể gỡ issuer.
- Đây là **quyết định thiết kế** cho mô hình một trường.
- Giảm thiểu P2: multisig 2/3, timelock.
- Ghi rõ trong báo cáo phần “hạn chế”.

### 5.4 Bất biến

- Không upgradeable.
- Nếu bug: deploy contract mới, cập nhật địa chỉ, chứng chỉ cũ không chuyển theo.
- Đổi lại: không ai sửa được dữ liệu đã ghi.

### 5.5 Kiểm tra trước deploy

- [ ] Test 30 case pass
- [ ] Coverage > 90%
- [ ] Không có `tx.origin`
- [ ] Không có `delegatecall`
- [ ] Giới hạn độ dài string
- [ ] Event đầy đủ
- [ ] Verify source trên Etherscan
- [ ] `addIssuer` đúng ví

---

## 6. Bảo mật Backend

### 6.1 Auth

| Kiểm soát | Cấu hình |
|---|---|
| Password hash | bcrypt cost 10–12 |
| JWT | HS256, secret ≥ 32 ký tự, hết hạn 7d |
| Login rate limit | 5/phút/IP |
| Generic error | “Email hoặc mật khẩu không đúng” |
| Role guard | `requireRole('admin' \| 'issuer')` |
| Token trong log | ❌ không bao giờ |

### 6.2 Input

- zod cho body, query, params.
- Whitelist field — không nhận field lạ.
- Chặn key bắt đầu bằng `$` hoặc chứa `.` trong query.
- Giới hạn độ dài mọi string.
- Validate địa chỉ ví, hash, CID, GPA, năm.

### 6.3 Upload

```
1. multer memoryStorage, 5MB
2. magic bytes (file-type)
3. chỉ PDF/PNG/JPEG
4. tên file sanitize
5. không lưu xuống disk
6. hash SHA-256
7. upload Pinata
```

Không bao giờ chạy file người dùng, không render HTML từ upload.

### 6.4 Xác minh giao dịch

Đây là lớp quan trọng nhất:

```
receipt.status === 1
receipt.to === CONTRACT_ADDRESS
event name === CertificateIssued
event.args.idHash === keccak256(certificateId)
event.args.fileHash === body.fileHash
event.args.issuer === user.walletAddress
```

Thiếu bất kỳ bước nào → `422 TX_INVALID`.

### 6.5 Phân quyền dữ liệu

- Issuer chỉ đọc/ghi chứng chỉ của mình.
- Admin đọc tất cả.
- Public chỉ đọc DTO đã lọc.
- Không trả `_id`, `issuerId`, `issuerWallet` ở public.

### 6.6 HTTP

| Header/Middleware | Giá trị |
|---|---|
| Helmet | bật |
| CORS | whitelist domain |
| Body limit | 1MB |
| Rate limit | 60/phút global, 30/phút public |
| Trust proxy | 1 |
| Error | không stack ở production |
| HTTPS | Render tự cấp |

### 6.7 Log

- Log requestId, method, path, status, thời gian.
- **Không** log: password, token, JWT, Cookie, body upload.
- Mask địa chỉ ví nếu cần.
- Log lỗi xác minh tx để điều tra.

---

## 7. Bảo mật Frontend

| Rủi ro | Kiểm soát |
|---|---|
| XSS | React auto-escape, không `dangerouslySetInnerHTML` |
| Token trong localStorage | Chấp nhận cho demo; production dùng httpOnly cookie |
| Lộ env | Chỉ `NEXT_PUBLIC_*`; không có secret |
| Clickjacking | `X-Frame-Options: DENY` |
| MIME sniffing | `X-Content-Type-Options: nosniff` |
| Referrer | `Referrer-Policy: strict-origin-when-cross-origin` |
| CSP | `next.config` header, hạn chế script |
| Seed phrase | Không bao giờ hỏi người dùng |
| Link ngoài | `rel="noopener noreferrer"` |
| Dependency | `npm audit`, lockfile |

**CSP gợi ý:**

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://gateway.pinata.cloud;
connect-src 'self' https://vc-api.onrender.com https://ethereum-sepolia-rpc.publicnode.com;
frame-ancestors 'none';
```

`unsafe-inline` cho Next.js; nếu dùng nonce thì chặt hơn.

---

## 8. Quản lý khóa

| Secret | Lưu ở | Ai đọc | Rotate |
|---|---|---|---|
| Private key ví | Local `contracts/.env` | Chỉ bạn | Tạo ví mới nếu lộ |
| JWT secret | Render env | Backend | Đổi → logout toàn bộ |
| Pinata JWT | Render env | Backend | Revoke + tạo mới |
| Mongo URI | Render env | Backend | Đổi password |
| Infura key | Render + local | Backend/contract | Tạo key mới |
| Etherscan key | Local | Hardhat | Tạo key mới |
| GitHub/Vercel/Render | Tài khoản | Bạn | Bật 2FA |

**Quy tắc:**

- Không commit.
- Không gửi qua chat/email.
- Không đặt ở frontend.
- Dùng `.env.example` cho người khác.
- Nếu đã lộ: rotate ngay, không chờ.

---

## 9. Riêng tư & tuân thủ

### 9.1 Nguyên tắc

| Nguyên tắc | Áp dụng |
|---|---|
| Tối thiểu hóa | Chỉ lưu tên, MSSV, ngành, năm, GPA |
| Mục đích rõ ràng | Xác thực chứng chỉ |
| Không lên chain | PII chỉ ở MongoDB |
| Kiểm soát truy cập | Role + scoped query |
| Lưu trữ có thời hạn | Audit log 180 ngày |
| Minh bạch | Trang privacy notice (P1) |

### 9.2 Xung đột “quyền xóa” và blockchain

Blockchain bất biến, không thể xóa hash đã ghi.

**Cách xử lý:**

- Không đưa PII lên chain → xóa PII ở Mongo là đủ cho yêu cầu xóa dữ liệu cá nhân.
- Hash của file vẫn còn, nhưng không thể suy ra tên/MSSV.
- Nếu cần xóa hoàn toàn: revoke on-chain + xóa metadata off-chain; PDF vẫn trên IPFS (có thể unpin).
- Ghi rõ giới hạn này trong báo cáo.

### 9.3 Tra cứu công khai

- Tên + MSSV công khai theo yêu cầu nghiệp vụ.
- Che bớt ở widget “cấp gần đây”.
- Rate limit, không export hàng loạt.
- Không hiển thị ngày sinh, CCCD, địa chỉ.
- P1: cờ `isPublic` từng chứng chỉ hoặc yêu cầu nhập đúng MSSV + mã.

### 9.4 Tham chiếu pháp lý

- Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
- Luật An ninh mạng 2018.
- Đây là đồ án, không phải tư vấn pháp lý; chỉ nêu nguyên tắc.

---

## 10. Hạ tầng & tài khoản

| Nền tảng | Kiểm soát |
|---|---|
| GitHub | 2FA, repo private, branch protection `main` |
| Vercel | 2FA, chỉ owner deploy |
| Render | 2FA, không chia sẻ API key |
| Atlas | 2FA, user riêng, IP allowlist, M0 |
| Pinata | 2FA, JWT scoped |
| Infura | Hạn chế domain nếu có |
| MetaMask | Ví test riêng, không dùng ví cá nhân |

**Atlas:** khi demo để `0.0.0.0/0`; sau demo thu hẹp. Ghi chú rủi ro.

---

## 11. Phát hiện & ứng cứu sự cố

### 11.1 Dấu hiệu

- Tx lạ trên Etherscan từ ví issuer.
- Log 401/403 tăng bất thường.
- Upload hàng loạt.
- Pinata usage tăng vọt.
- Email cảnh báo đăng nhập lạ.

### 11.2 Quy trình

```
1. Phát hiện
2. Khoanh vùng (revoke key, tắt service, đổi mật khẩu)
3. Xóa nguyên nhân
4. Khôi phục từ backup
5. Ghi postmortem
```

### 11.3 Kịch bản

| Sự cố | Hành động ngay |
|---|---|
| Lộ private key | Chuyển tiền sang ví mới; gỡ issuer cũ; thêm issuer mới |
| Lộ JWT secret | Đổi secret; redeploy; toàn bộ user đăng nhập lại |
| Lộ Mongo URI | Đổi password; kiểm tra log truy cập |
| Lộ Pinata JWT | Revoke key; tạo JWT mới; kiểm tra pin |
| Contract bị lạm quyền | Gỡ issuer; revoke cert bất thường; cân nhắc deploy mới |
| Website bị sửa | Rollback Vercel; đổi mật khẩu; audit |
| DB bị xóa | Restore backup; thông báo |

### 11.4 Lưu bằng chứng

- Tx hash, block number.
- Log Render (thời điểm).
- Ảnh chụp màn hình.
- Không xóa log trước khi điều tra xong.

---

## 12. Kiểm thử bảo mật

### 12.1 OWASP Top 10

| Mục | Kiểm tra | Kỳ vọng |
|---|---|---|
| A01 Broken Access Control | Issuer gọi admin API; IDOR cert của issuer khác | 403 |
| A02 Cryptographic Failures | Không có secret trong bundle; HTTPS | Pass |
| A03 Injection | `$ne`, `$gt` trong query; XSS tên SV | Không ảnh hưởng |
| A04 Insecure Design | Tx giả; revoke trái phép | Bị chặn |
| A05 Security Misconfiguration | Header, CORS, stack trace | Đúng |
| A06 Vulnerable Components | `npm audit` | Không high/critical |
| A07 Auth Failures | Brute force login | 429 |
| A08 Data Integrity | Sửa metadata, PDF | Verify fail |
| A09 Logging Failures | Log có token không | Không |
| A10 SSRF | URL do người dùng nhập | Không có |

### 12.2 Checklist

- [ ] Không có `.env` trong Git
- [ ] `gitleaks` / GitHub secret scanning sạch
- [ ] `npm audit` không high/critical
- [ ] JWT hết hạn đúng
- [ ] Rate limit hoạt động
- [ ] CORS chặn origin lạ
- [ ] Upload `.exe` đổi tên bị chặn
- [ ] `txHash` giả bị 422
- [ ] Issuer A không revoke cert B
- [ ] Public API không trả field nội bộ
- [ ] Recent widget không trả tên đầy đủ
- [ ] Header bảo mật đủ
- [ ] Không lộ stack trace
- [ ] Không log body nhạy cảm

---

## 13. DevSecOps

| Bước | Công cụ |
|---|---|
| Pre-commit | `gitleaks`, ESLint |
| CI (nếu có) | `npm audit`, build, test |
| Review | Checklist PR |
| Deploy | Env riêng, không hardcode |
| Sau deploy | Smoke test + header scan |

**Branch protection:** không push trực tiếp `main`; PR + review (kể cả tự review).

---

## 14. Rủi ro còn lại

| Rủi ro | Chấp nhận? | Ghi chú |
|---|---|---|
| Owner tập trung quyền | ✅ | Mô hình một trường; ghi báo cáo |
| JWT trong localStorage | ✅ demo | Production đổi cookie |
| PII công khai | ✅ theo yêu cầu | Có rate limit, che widget |
| IPFS không xóa thật | ✅ | Bản chất IPFS |
| Testnet có thể reset | ✅ | Lưu bằng chứng |
| Không audit độc lập | ✅ | Đồ án |
| Không có WAF | ✅ | Render free |

---

## 15. Checklist trước bảo vệ

- [ ] Không secret trong repo
- [ ] `.env` bị ignore
- [ ] 2FA GitHub/Vercel/Render/Atlas
- [ ] Contract verified
- [ ] `txHash` giả bị chặn
- [ ] Phân quyền issuer/admin đúng
- [ ] Rate limit bật
- [ ] CORS đúng domain
- [ ] Header bảo mật
- [ ] Recent widget che PII
- [ ] Không log token
- [ ] Backup DB
- [ ] Kịch bản rotate key đã viết
- [ ] Báo cáo ghi rõ hạn chế
