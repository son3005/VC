# Testing & QA Plan — Verify Certification

> Mục tiêu: chứng minh hệ thống đúng ở cả 4 tầng — contract, backend, frontend, tích hợp — trước ngày bảo vệ.
>
> Tài liệu liên quan: [integration-api-contract.md](integration-api-contract.md)

---

## 1. Phạm vi

| Trong phạm vi | Ngoài phạm vi |
|---|---|
| Smart contract trên Sepolia | Mainnet |
| API backend | Load test hàng nghìn người |
| Giao diện frontend | Đa ngôn ngữ |
| Luồng tích hợp 3 tầng | Mobile app native |
| Bảo mật cơ bản | Pentest chuyên sâu |
| Hiệu năng ở mức đồ án | Tối ưu chi phí production |

---

## 2. Chiến lược — kim tự tháp 5 tầng

```
        ┌──────────────┐
        │  Manual UAT  │  ít, nhưng bắt buộc
        ├──────────────┤
        │   E2E Test   │  Playwright, 10–15 case
        ├──────────────┤
        │ Integration  │  Supertest + DB test
        ├──────────────┤
        │    Unit      │  Jest, hàm thuần
        ├──────────────┤
        │  Contract    │  Hardhat, 30 case
        └──────────────┘
```

Nguyên tắc:

- Lỗi ở tầng thấp phải được bắt trước khi lên tầng cao.
- Mỗi luồng nghiệp vụ có **ít nhất một** E2E.
- Không test thủ công những gì đã có test tự động.
- Ưu tiên test theo **rủi ro**, không theo số lượng.

---

## 3. Môi trường test

| Môi trường | Contract | DB | IPFS | Dùng cho |
|---|---|---|---|---|
| Local | Hardhat node | MongoDB local/Atlas test | Pinata test | Dev, unit, integration |
| Staging | Sepolia | Atlas `verify_cert_test` | Pinata | E2E trước demo |
| Production | Sepolia | Atlas `verify_cert` | Pinata | Smoke test only |

**Quy tắc:**

- Không chạy test phá hoại trên production.
- Không dùng chung DB test và DB demo.
- Không commit file test chứa secret.

---

## 4. Dữ liệu test

### 4.1 Tài khoản

| Vai trò | Email | Password | Ví |
|---|---|---|---|
| Admin | `admin@verifycert.local` | `Admin@123456` | ví owner |
| Issuer CNTT | `issuer@verifycert.local` | `Issuer@123456` | `0x9b8D...1b3B` |
| Issuer KTPM | `issuer2@verifycert.local` | `Issuer2@123456` | ví B |

### 4.2 Chứng chỉ mẫu

| Mã | SV | Ngành | Năm | GPA | Trạng thái | File |
|---|---|---|---|---|---|---|
| `UIT-2024-CS-0001` | Nguyễn Văn An | CNTT | 2026 | 3.45 | active | `valid.pdf` |
| `UIT-2024-CS-0002` | Trần Thị Bình | KTPM | 2026 | 3.10 | active | `valid2.pdf` |
| `UIT-2023-CS-0003` | Lê Văn Cường | CNTT | 2025 | 2.80 | revoked | `valid3.pdf` |
| `UIT-2024-CS-0004` | Phạm Thị Dung | CNTT | 2024 | 3.80 | active | `valid4.pdf` |

### 4.3 File fixture

| File | Mục đích | Cách tạo |
|---|---|---|
| `valid.pdf` | Verify thành công | PDF thật |
| `tampered.pdf` | Verify thất bại | Sửa 1 byte của `valid.pdf` |
| `wrong.pdf` | Không tìm thấy | PDF khác hoàn toàn |
| `fake.pdf` | Upload sai MIME | Đổi đuôi `.exe` → `.pdf` |
| `large.pdf` | Quá 5MB | Tạo file > 5MB |
| `cert.html` | Test loại web (P2) | HTML tự chứa |

### 4.4 Dữ liệu biên

- GPA `0`, `4.0`, `3.999`, `-1`, `4.01`.
- Năm `1999`, `2000`, `2100`, `2101`.
- MSSV 5 ký tự, 13 ký tự, chữ cái.
- Tên có dấu, không dấu, khoảng trắng đầu/cuối.
- `certificateId` trùng, rỗng, 65 ký tự.
- Hash sai format, hash rỗng.

---

## 5. Test Smart Contract

Chi tiết 30 case ở [smart-contract-plan.md](smart-contract-plan.md). Tóm tắt nhóm:

| Nhóm | Số case | Ưu tiên |
|---|---|---|
| Quản trị issuer | 9 | P0 |
| Cấp chứng chỉ | 7 | P0 |
| Thu hồi | 5 | P0 |
| Đọc dữ liệu | 5 | P0 |
| Event + counter | 4 | P1 |

**Lệnh:**

```bash
cd contracts
npx hardhat test
npx hardhat coverage
REPORT_GAS=true npx hardhat test
```

**Điều kiện qua:**

- 100% case pass.
- Coverage > 90%.
- Không warning compiler.

---

## 6. Test Backend

### 6.1 Unit

| ID | Test | Kỳ vọng |
|---|---|---|
| BU-01 | `sha256File` | đúng `sha256:<64 hex>` |
| BU-02 | `normalize('Nguyễn Văn An')` | `nguyen van an` |
| BU-03 | `normalize('Đặng Đình Đức')` | `dang dinh duc` |
| BU-04 | `maskName('Nguyễn Văn An')` | `Nguyễn V. A.` |
| BU-05 | `maskCode('2311095')` | `2311***` |
| BU-06 | zod GPA 4.01 | fail |
| BU-07 | zod GPA 3.45 | pass |
| BU-08 | zod certificateId rỗng | fail |
| BU-09 | zod hash sai format | fail |
| BU-10 | `verifyIssueTx` với tx hash giả | throw `TX_INVALID` |

### 6.2 Integration (Supertest)

| ID | Case | Kỳ vọng |
|---|---|---|
| BI-01 | Login đúng | 200 + token |
| BI-02 | Login sai | 401, message chung |
| BI-03 | `/certificates` không token | 401 |
| BI-04 | Issuer gọi `/issuers` | 403 |
| BI-05 | Upload PDF hợp lệ | 200 + cid + hash |
| BI-06 | Upload sai MIME | 400 |
| BI-07 | Upload > 5MB | 400 |
| BI-08 | Upload hash lệch | 400 |
| BI-09 | POST cert tx giả | 422 |
| BI-10 | POST cert trùng id | 409 |
| BI-11 | POST cert trùng hash | 409 |
| BI-12 | POST cert thành công | 201 |
| BI-13 | Search theo MSSV | đúng 1 kết quả |
| BI-14 | Search tên có dấu | giống không dấu |
| BI-15 | Recent | masked, không lộ tên |
| BI-16 | Verify hash không tồn tại | `exists=false`, HTTP 200 |
| BI-17 | Revoke sai issuer | 403/422 |
| BI-18 | Revoke lần 2 | 409 |
| BI-19 | Health | 200, db connected |
| BI-20 | Rate limit login | 429 sau 5 lần |

**Lệnh:**

```bash
cd backend
npm test
```

---

## 7. Test Frontend

### 7.1 Component

| ID | Case | Kỳ vọng |
|---|---|---|
| FC-01 | `StatusBadge` active | navy + vàng |
| FC-02 | `StatusBadge` revoked | accent |
| FC-03 | `HashPreview` copy | clipboard đúng |
| FC-04 | `FileDropzone` sai MIME | báo lỗi |
| FC-05 | `FileDropzone` > 5MB | báo lỗi |
| FC-06 | `SearchBar` Enter | gọi callback |
| FC-07 | `SearchBar` Esc | xóa query |
| FC-08 | `RecentCertificates` loading | skeleton |
| FC-09 | `RecentCertificates` lỗi | ẩn widget |
| FC-10 | `Pagination` trang cuối | nút Next disabled |

### 7.2 E2E (Playwright)

| ID | Kịch bản | Tiền điều kiện | Kỳ vọng |
|---|---|---|---|
| E2E-01 | Đăng nhập issuer | Seed sẵn | Vào `/issuer` |
| E2E-02 | Cấp chứng chỉ thành công | Ví đủ ETH, đúng mạng | Tx confirmed, cert hiện trong DB |
| E2E-03 | Cấp trùng mã | Cert đã tồn tại | UI báo lỗi, không gửi tx |
| E2E-04 | Cấp trùng hash | File đã dùng | Contract revert, UI báo |
| E2E-05 | Sai mạng | MetaMask mạng khác | Chặn, hiện nút Switch |
| E2E-06 | Từ chối ký | Bấm Reject | UI reset, không treo |
| E2E-07 | Verify theo mã đúng | Cert active | ✅ kèm chi tiết |
| E2E-08 | Verify theo file đúng | `valid.pdf` | ✅ |
| E2E-09 | Verify file sửa | `tampered.pdf` | ⚠️ không tìm thấy |
| E2E-10 | Verify cert revoked | `UIT-2023-CS-0003` | ❌ đã thu hồi |
| E2E-11 | Issuer A revoke cert B | Đăng nhập A | Không thấy nút hoặc bị chặn |
| E2E-12 | Search theo năm + ngành | Dữ liệu mẫu | Đúng số lượng |
| E2E-13 | Search theo tên | Có/không dấu | Cùng kết quả |
| E2E-14 | Recent widget | Có cert mới | Hiện masked, không full |
| E2E-15 | `/c/[id]` refresh | Cert tồn tại | Không 404 |
| E2E-16 | Mobile 375px | — | Không tràn ngang |
| E2E-17 | Sai token | Token hết hạn | Về `/login` |
| E2E-18 | Backend restart | Kill backend | Frontend báo lỗi, retry được |

**Lệnh:**

```bash
cd frontend
npx playwright test
npx playwright test --headed
```

---

## 8. Acceptance Criteria

### AC-01 — Cấp chứng chỉ

```gherkin
Given issuer đã đăng nhập và đúng mạng Sepolia
  And file PDF hợp lệ ≤ 5MB
When issuer điền đủ thông tin và bấm "Cấp chứng chỉ"
  And ký giao dịch trong MetaMask
Then chứng chỉ xuất hiện trong dashboard với trạng thái "Hợp lệ"
  And tx hiển thị trên Etherscan với đúng fileHash
  And metadata lưu trong MongoDB khớp form
```

### AC-02 — Tra cứu theo file

```gherkin
Given chứng chỉ đã được cấp
When người dùng tải đúng file PDF lên /verify
Then hệ thống hiển thị "Chứng chỉ hợp lệ"
  And thông tin khớp với chứng chỉ gốc
```

### AC-03 — Phát hiện giả mạo

```gherkin
Given file PDF đã bị sửa 1 byte
When người dùng tải lên /verify
Then hệ thống hiển thị "Không tìm thấy chứng chỉ"
  And không hiển thị bất kỳ thông tin cá nhân nào
```

### AC-04 — Thu hồi

```gherkin
Given chứng chỉ đang active
When issuer bấm "Thu hồi" và ký giao dịch
Then trạng thái đổi thành "Đã thu hồi" trong vòng 5 giây
  And trang /c/[id] hiện banner đỏ
  And verify bằng file trả về "đã thu hồi"
```

### AC-05 — Phân quyền

```gherkin
Given issuer A đăng nhập
When A mở chứng chỉ do issuer B cấp
Then không thấy nút thu hồi
  And gọi API trực tiếp trả 403
```

### AC-06 — Tìm kiếm công khai

```gherkin
Given có 4 chứng chỉ mẫu
When lọc năm 2026 và ngành CNTT
Then chỉ hiện chứng chỉ khớp cả hai điều kiện
  And phân trang đúng
  And click dòng mở /c/[id]
```

---

## 9. Test phi chức năng

### 9.1 Hiệu năng

| Chỉ số | Mục tiêu | Cách đo |
|---|---|---|
| API search (100 cert) | < 500ms | Postman/curl |
| API search (1.000 cert) | < 1s | seed + đo |
| Trang `/c/[id]` | < 3s (cold) | Lighthouse |
| Trang `/search` | < 2s | Lighthouse |
| Upload 5MB | < 10s | bấm giờ |
| Cold start Render | ghi nhận, không tính fail | log |

### 9.2 Bảo mật

| ID | Kiểm tra | Kỳ vọng |
|---|---|---|
| SEC-01 | Truy cập API không token | 401 |
| SEC-02 | Sửa JWT | 401 |
| SEC-03 | Issuer gọi admin API | 403 |
| SEC-04 | Upload file `.exe` đổi tên | 400 |
| SEC-05 | SQL/NoSQL injection `$ne` | không ảnh hưởng |
| SEC-06 | XSS trong tên SV | React escape |
| SEC-07 | CORS origin lạ | bị chặn |
| SEC-08 | Rate limit login | 429 |
| SEC-09 | Response lỗi production | không có stack |
| SEC-10 | Bundle frontend | không có secret |

### 9.3 Accessibility

- [ ] Form có label
- [ ] Focus visible
- [ ] Keyboard đi hết luồng verify
- [ ] Contrast đạt AA (đã tính)
- [ ] Ảnh có alt
- [ ] Không chỉ dùng màu để báo trạng thái (có icon + text)

### 9.4 Responsive

| Kích thước | Kiểm tra |
|---|---|
| 375px | search, bảng, form |
| 768px | tablet |
| 1440px | desktop |

---

## 10. Quy trình bug

### 10.1 Mức độ

| Mức | Định nghĩa | Ví dụ |
|---|---|---|
| **S1 — Blocker** | Không demo được, mất dữ liệu, lộ secret | Không cấp được cert, tx giả được chấp nhận |
| **S2 — Major** | Sai chức năng chính, có workaround | Search sai kết quả, revoke không cập nhật |
| **S3 — Minor** | Sai UI, không ảnh hưởng luồng | Lệch spacing, sai màu badge |
| **S4 — Cosmetic** | Typo, căn chỉnh | |

### 10.2 Template

```md
**ID:** BUG-001
**Mức:** S2
**Môi trường:** Chrome 130 / Sepolia / production
**Tiền điều kiện:**
**Bước tái hiện:**
1.
2.
**Kỳ vọng:**
**Thực tế:**
**Bằng chứng:** screenshot / tx hash / log
**Ghi chú:**
```

### 10.3 Quy tắc

- S1/S2 phải sửa trước demo.
- S3/S4 có thể chấp nhận, ghi vào “known issues”.
- Mỗi bug sửa xong phải thêm test tái hiện nếu có thể.

---

## 11. Lịch test

| Tuần | Việc | Mốc |
|---|---|---|
| 1 | Contract unit + coverage | 30/30 pass |
| 2 | Backend unit + integration | 20/20 pass |
| 3 | Frontend component + bắt đầu E2E | 10/10 component |
| 4 | E2E đầy đủ + regression | 18/18 E2E |
| Trước demo 2 ngày | Full regression trên staging | Không còn S1/S2 |
| Trước demo 1 ngày | Freeze code, chạy smoke test | Video dự phòng |
| Ngày demo | Smoke test 30 phút trước | Tất cả xanh |

---

## 12. Smoke test trước demo

Chạy trong 15 phút:

- [ ] `GET /api/health` trả 200 + block number
- [ ] Đăng nhập issuer
- [ ] Mở `/search`, tìm theo MSSV
- [ ] Mở `/c/UIT-2024-CS-0001`
- [ ] Verify `valid.pdf` → ✅
- [ ] Verify `tampered.pdf` → ⚠️
- [ ] Verify cert revoked → ❌
- [ ] Recent widget hiện masked
- [ ] MetaMask đúng Sepolia, đủ ETH
- [ ] CORS không lỗi console
- [ ] Video demo mở được

---

## 13. Bằng chứng cần lưu

| Loại | Dùng cho |
|---|---|
| Tx hash issue + revoke | Báo cáo, slide |
| Ảnh Etherscan contract verified | Phụ lục |
| Screenshot 3 trạng thái verify | Slide |
| Log lỗi đã sửa | Phần “khó khăn” |
| Kết quả test (pass/fail) | Phụ lục |
| Video demo | Dự phòng |

---

## 14. Điều kiện kết thúc

- [ ] 100% test contract pass
- [ ] 100% test backend P0 pass
- [ ] 18/18 E2E pass trên staging
- [ ] Không còn bug S1/S2
- [ ] Smoke test production pass
- [ ] Video demo đã quay
- [ ] Known issues được ghi rõ

---

## 15. Rủi ro test

| Rủi ro | Ảnh hưởng | Xử lý |
|---|---|---|
| Không có ví test thứ 2 | Không test phân quyền | Tạo ví mới, xin faucet |
| Faucet cạn | Không deploy lại | Xin nhiều nguồn, giữ 0.2 ETH |
| Test DB bẩn | Kết quả sai | Script reset trước mỗi run |
| Render cold start | E2E timeout | Tăng timeout, warm-up trước |
| MetaMask popup chặn | E2E treo | Test thủ công luồng ký |
| Thiếu thời gian | Bỏ test | Ưu tiên P0 + E2E-02/07/08/09/10 |
