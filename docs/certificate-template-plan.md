# Kế hoạch Certificate Template — Verify Certification

> Thiết kế và sinh file PDF chứng chỉ — artifact gốc được neo hash on-chain.
>
> Liên quan: [integration-api-contract.md](integration-api-contract.md) · [frontend-plan.md](frontend-plan.md)

---

## 1. Mục tiêu

| Mục tiêu | Cách đo |
|---|---|
| Nhìn như văn bằng thật, không phải file xuất từ Word | Đánh giá thị giác, in thử A4 |
| Thông tin rõ ràng, đúng dữ liệu | Kiểm tra từng field |
| Có đường tra cứu ngay trên bản in | QR quét được |
| Không in trạng thái cố định | Không có chữ “còn hiệu lực” |
| Không in hash của chính nó | Không tự tham chiếu |
| File nhẹ, in tốt | < 500KB, 300 DPI assets |

---

## 2. Vai trò của template trong hệ thống

```
Form dữ liệu
    ↓
Template PDF  →  SHA-256  →  IPFS (CID)  →  MetaMask ký  →  On-chain
    ↓
Bản in cho sinh viên
```

PDF là **artifact gốc**. Trang `/c/[id]` chỉ là bản xem động. Mọi xác thực dựa trên hash của PDF.

---

## 3. Định dạng

| Thuộc tính | Giá trị |
|---|---|
| Khổ | **A4 ngang** 297 × 210 mm |
| Điểm ảnh | 841.89 × 595.28 pt |
| Lề ngoài | 15 mm |
| Bleed | 3 mm (nếu in nhà in) |
| Nền | `#FAF4DF` |
| Màu chính | `#010E1C` |
| Màu nhấn | `#E6AB42` |
| Màu phụ | `#A48B73` |
| Màu cảnh báo | `#E6606A` (chỉ dùng cho ghi chú, không dùng nền lớn) |
| Font tiêu đề | Playfair Display |
| Font nội dung | Be Vietnam Pro |
| Font mã/hash | JetBrains Mono |

**Vì sao ngang?** Văn bằng hiện đại thường in ngang, hiển thị tốt trên màn hình 16:9, dễ đặt QR và con dấu.

### 3.1 Bốn loại template

Không dùng một template duy nhất. Mỗi loại chứng chỉ có tiêu đề, bố cục nội dung và bộ field riêng, nhưng **dùng chung khung, màu, QR, chữ ký**.

| Mã | Loại | Tiêu đề | Dùng khi | Prefix ID |
|---|---|---|---|---|
| `degree` | Tốt nghiệp | CHỨNG NHẬN TỐT NGHIỆP | Hoàn thành chương trình đại học | `UIT-DEG` |
| `course` | Khóa học / môn học | CHỨNG CHỈ HOÀN THÀNH KHÓA HỌC | Hoàn thành môn, khóa ngắn hạn | `UIT-CRS` |
| `credit` | Tín chỉ | CHỨNG NHẬN TÍN CHỈ | Tích lũy tín chỉ, chuyển đổi | `UIT-CRE` |
| `other` | Khác | Tiêu đề tùy chỉnh | Workshop, cuộc thi, chứng nhận nội bộ | `UIT-OTH` |

**Ví dụ mã chứng chỉ:**

```
UIT-DEG-2026-0001
UIT-CRS-2026-0142
UIT-CRE-2026-0035
UIT-OTH-2026-0007
```

Quy ước: `{SCHOOL}-{TYPE}-{YEAR}-{SEQUENCE}`. Sequence 4 chữ số, do issuer nhập hoặc backend gợi ý.

### 3.2 Phần dùng chung và phần riêng

| Thành phần | Dùng chung | Riêng theo loại |
|---|---|---|
| Khung viền, nền, màu | ✅ | |
| Logo, tên trường | ✅ | |
| Tên sinh viên, MSSV | ✅ | |
| Số chứng chỉ, ngày cấp | ✅ | |
| QR + link tra cứu | ✅ | |
| Disclaimer | ✅ | |
| Chữ ký, con dấu | ✅ | |
| Tiêu đề | | ✅ |
| Khối nội dung chính | | ✅ |
| Bộ field chi tiết | | ✅ |
| Màu nhấn phụ (tùy chọn) | | ✅ |

**Nguyên tắc:** khác nhau ở **nội dung**, không khác nhau ở **nhận diện**. Bốn loại phải trông như cùng một bộ văn bằng của trường.

---

## 4. Bố cục chung

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo]  TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN       Số: UIT-...    │
│                                                                  │
│                  CHỨNG NHẬN TỐT NGHIỆP                           │
│                                                                  │
│                      Nguyễn Văn An                               │
│                       MSSV: 2311095                              │
│                                                                  │
│         đã hoàn thành chương trình đào tạo trình độ đại học      │
│                                                                  │
│         Ngành: Kỹ thuật phần mềm                                 │
│         Niên khóa: 2022 – 2026                                   │
│         GPA: 3.45 / 4.00        Xếp loại: Giỏi                   │
│                                                                  │
│   Ngày cấp: 19/10/2026        [Con dấu]        [Chữ ký]          │
│   Khoa Công nghệ Thông tin     HIỆU TRƯỞNG                       │
│                                                                  │
│  [QR]  Tra cứu tại: https://vc-frontend.vercel.app/c/UIT-...     │
│        Chứng chỉ chỉ có giá trị khi tra cứu thấy trạng thái      │
│        hợp lệ.                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 4.1 Vùng chức năng

| Vùng | Nội dung | Toạ độ gợi ý |
|---|---|---|
| Header | Logo, tên trường, số chứng chỉ | y 30–90 |
| Title | “CHỨNG NHẬN TỐT NGHIỆP” | y 120 |
| Tên SV | Serif lớn, 28–32pt | y 190 |
| Thông tin | MSSV, ngành, khóa, GPA, xếp loại | y 250–340 |
| Ký | Ngày cấp, đơn vị cấp, chữ ký, con dấu | y 400–470 |
| Footer | QR, link tra cứu, disclaimer | y 500–560 |

### 4.2 Đường viền

- Viền ngoài: 2pt `#E6AB42`, inset 20pt.
- Viền trong: 0.75pt `#010E1C`, inset 26pt.
- Hoa văn góc: 4 góc, PNG trong suốt hoặc vẽ vector.
- Nền: `#FAF4DF`, có thể thêm texture giấy rất nhẹ (opacity 3–5%).

### 4.3 Biến thể theo loại

#### `course` — Khóa học / môn học

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo]  TRƯỜNG ĐẠI HỌC...                    Số: UIT-CRS-... │
│                                                              │
│              CHỨNG CHỈ HOÀN THÀNH KHÓA HỌC                   │
│                                                              │
│                    Nguyễn Văn An                             │
│                     MSSV: 2311095                            │
│                                                              │
│        đã hoàn thành khóa học “Lập trình Blockchain”         │
│                                                              │
│   Mã môn: CS409   Số tín chỉ: 3   Học kỳ: HK1 2026           │
│   Điểm: 8.5/10 (quy đổi 3.40/4)   Thời lượng: 45 giờ         │
│                                                              │
│   Ngày cấp: 19/10/2026      [Con dấu]      [Chữ ký]          │
│                                                              │
│  [QR]  Tra cứu: https://.../c/UIT-CRS-2026-0142              │
└──────────────────────────────────────────────────────────────┘
```

Điểm nhấn: **tên khóa học** là dòng lớn thứ hai, sau tên sinh viên. Không hiển thị GPA hay xếp loại tốt nghiệp.

#### `credit` — Tín chỉ

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo]  TRƯỜNG ĐẠI HỌC...                    Số: UIT-CRE-... │
│                                                              │
│                   CHỨNG NHẬN TÍN CHỈ                         │
│                                                              │
│                    Nguyễn Văn An                             │
│                     MSSV: 2311095                            │
│                                                              │
│   Chương trình: Kỹ thuật phần mềm — Khóa 2022–2026           │
│   Tổng tín chỉ: 132    Đã tích lũy: 128    GPA: 3.45         │
│                                                              │
│   ┌────────────────────────────────────────────────────┐     │
│   │ Mã môn │ Tên môn            │ Tín chỉ │ Điểm (hệ 10)│     │
│   │ CS101  │ Nhập môn lập trình │ 4       │ 8.5         │     │
│   │ CS202  │ Cấu trúc dữ liệu   │ 3       │ 8.0         │     │
│   │ ...    │ ...                │ ...     │ ...         │     │
│   └────────────────────────────────────────────────────┘     │
│                                                              │
│   Ngày cấp: 19/10/2026      [Con dấu]      [Chữ ký]          │
│  [QR]  Tra cứu: https://.../c/UIT-CRE-2026-0035              │
└──────────────────────────────────────────────────────────────┘
```

Giới hạn **tối đa 8 dòng môn học** để không tràn trang. Nếu nhiều hơn, dùng chứng nhận tổng hợp + bảng điểm riêng.

#### `other` — Khác

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo]  TRƯỜNG ĐẠI HỌC...                    Số: UIT-OTH-... │
│                                                              │
│                  CHỨNG NHẬN THAM GIA                         │
│                                                              │
│                    Nguyễn Văn An                             │
│                                                              │
│        đã tham gia và hoàn thành “Blockchain Workshop 2026”  │
│                                                              │
│   Tổ chức: Khoa CNTT        Thời gian: 12–14/06/2026         │
│   Vai trò: Thành viên       Kết quả: Hoàn thành              │
│                                                              │
│   Ngày cấp: 19/10/2026      [Con dấu]      [Chữ ký]          │
│  [QR]  Tra cứu: https://.../c/UIT-OTH-2026-0007              │
└──────────────────────────────────────────────────────────────┘
```

Tiêu đề lấy từ field `title`, không hard-code. Mô tả tối đa 3 dòng.

---

## 5. Nội dung theo loại

### 5.0 Quy ước điểm số

Trong hệ thống có **hai loại điểm khác nhau**, không được trộn:

| Loại | Hệ | Phạm vi | Field |
|---|---|---|---|
| GPA / điểm trung bình tích lũy | **Hệ 4** | 0.00 – 4.00 | `gpa` |
| Điểm môn / khóa học | Hệ 10, hệ 4 hoặc chữ | theo `gradeScale` | `grade` + `gradeScale` |

**Quy tắc hiển thị:**

```
GPA:     3.45/4.00
Điểm:    8.5/10   (nếu gradeScale = "10")
Điểm:    3.40/4   (nếu gradeScale = "4")
Điểm:    A        (nếu gradeScale = "letter")
```

- Luôn ghi đơn vị: `/10`, `/4`, hoặc chữ.
- Không bao giờ in `8.5` trần — người đọc không biết hệ nào.
- Nếu trường dùng hệ 10 cho môn học, in thêm quy đổi hệ 4 trong ngoặc nếu có.
- `gradeScale` bắt buộc với `course` và `credit`.

**Quy đổi tham khảo (chỉ để hiển thị, không dùng tính toán):**

| Hệ 10 | Hệ 4 | Chữ |
|---|---|---|
| 8.5 – 10 | 3.5 – 4.0 | A |
| 8.0 – 8.4 | 3.0 – 3.4 | B+ |
| 7.0 – 7.9 | 2.5 – 2.9 | B |
| 6.5 – 6.9 | 2.0 – 2.4 | C+ |
| 5.5 – 6.4 | 1.5 – 1.9 | C |
| 4.0 – 5.4 | 1.0 – 1.4 | D |
| < 4.0 | 0 | F |

> Nếu trường chỉ dùng một hệ, đặt `gradeScale` cố định và bỏ phần quy đổi. Không tự ý đổi điểm trong DB.

### 5.1 Field dùng chung

| Field | Nguồn | Ghi chú |
|---|---|---|
| Tên trường | Config | Cố định |
| Logo | Asset | PNG/SVG |
| Họ tên SV | Form | Font serif, lớn nhất |
| MSSV | Form | |
| Số chứng chỉ | Form | `certificateId` |
| Ngày cấp | Chain timestamp | `DD/MM/YYYY` |
| Đơn vị cấp | Issuer | |
| QR | Sinh từ `certificateId` | |
| Link tra cứu | Config + ID | |
| Disclaimer | Config | “Chỉ có giá trị khi tra cứu thấy hợp lệ” |

### 5.2 Field riêng — `degree`

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| `degreeTitle` | ✅ | “Cử nhân”, “Kỹ sư” |
| `major` | ✅ | |
| `graduationYear` | ✅ | |
| `gpa` | ✅ | thang 4 |
| `classification` | ✅ | |
| `studyMode` | 🟡 | “Chính quy” |
| `thesisTitle` | 🟡 | |

### 5.3 Field riêng — `course`

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| `courseCode` | ✅ | |
| `courseName` | ✅ | |
| `credits` | ✅ | 1–10 |
| `semester` | ✅ | “HK1 2025–2026” |
| `grade` | ✅ | 0–10, 0–4 hoặc A/B/C… tùy scale |
| `gradeScale` | ✅ | `10` \| `4` \| `letter` |
| `grade4` | 🟡 | quy đổi hệ 4 nếu trường có |
| `durationHours` | 🟡 | |
| `instructor` | 🟡 | |

### 5.4 Field riêng — `credit`

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| `programName` | ✅ | |
| `totalCredits` | ✅ | |
| `completedCredits` | ✅ | |
| `gpa` | 🟡 | hệ 4 |
| `gradeScale` | ✅ | hệ của cột điểm modules: `10` \| `4` \| `letter` |
| `modules` | 🟡 | tối đa 8 dòng `{ code, name, credits, grade, grade4? }` |
| `grade4` | 🟡 | GPA quy đổi nếu cần |

### 5.5 Field riêng — `other`

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| `title` | ✅ | tiêu đề in trên văn bằng |
| `description` | ✅ | tối đa 3 dòng |
| `organizer` | 🟡 | |
| `eventDate` | 🟡 | |
| `role` | 🟡 | |
| `result` | 🟡 | |
| `validUntil` | 🟡 | nếu có thời hạn |

### 5.6 Nội dung **không** in

| Không in | Lý do |
|---|---|
| Badge “còn hiệu lực” / “đã thu hồi” | Trạng thái thay đổi theo thời gian |
| Hash của chính PDF | Tự tham chiếu — xem mục 7 |
| TxHash | Chưa tồn tại tại thời điểm sinh PDF |
| Ngày sinh, CCCD, địa chỉ | PII không cần thiết |
| Bảng điểm đầy đủ | Chỉ loại `credit` in tối đa 8 môn |

---

## 6. QR & tra cứu

### 6.1 Nội dung QR

```
https://vc-frontend.vercel.app/c/UIT-2024-CS-0001
```

- Dùng domain production, không dùng localhost.
- QR version tự động theo độ dài.
- Error correction: **M** (15%).
- Quiet zone: 4 module.
- Kích thước in: 25 × 25 mm.
- Màu: đen trên nền kem, không đảo màu.

### 6.2 Kiểm tra

- [ ] Quét bằng điện thoại ở khoảng 20cm
- [ ] Quét được khi in đen trắng
- [ ] Link mở đúng `/c/[id]`
- [ ] QR không bị viền cắt

### 6.3 Dòng disclaimer

```
Chứng chỉ chỉ có giá trị khi tra cứu tại link trên và thấy trạng thái hợp lệ.
```

Đây là câu quan trọng: bản in không tự khẳng định hiệu lực.

---

## 7. Nghịch lý hash — điều phải hiểu đúng

Không thể in **hash của chính file PDF** vào trong file PDF.

Lý do:

```
Nội dung PDF (chưa có hash)
    → thêm hash vào → file thay đổi
    → hash mới lại khác
    → lặp vô hạn
```

Tương tự, **txHash chưa tồn tại** khi tạo PDF:

```
Tạo PDF → hash → ký tx → mới có txHash
```

Vì vậy:

| Thứ | Có in trên PDF? | Ở đâu |
|---|---|---|
| Số chứng chỉ | ✅ | Header |
| Link tra cứu | ✅ | Footer |
| QR | ✅ | Footer |
| Hash PDF | ❌ | On-chain + trang verify |
| TxHash | ❌ | Trang verify + Etherscan |
| Trạng thái | ❌ | Trang verify (động) |

**Cách bù:** in số chứng chỉ + QR. Người xem quét QR để thấy hash, txHash và trạng thái hiện tại.

---

## 8. Sinh PDF — chọn công cụ

| Phương án | Ưu | Nhược | Quyết định |
|---|---|---|---|
| **Puppeteer / Chromium** | HTML/CSS chính xác, dễ thiết kế | ~300MB, Render 512MB dễ OOM; build chậm | ❌ |
| **PDFKit** | Nhẹ, nhanh, kiểm soát từng điểm, không browser | Phải code layout thủ công | ✅ Chọn |
| **@react-pdf/renderer** | Component, flexbox, dễ maintain | Bundle lớn hơn, font setup phức tạp | 🟡 Dự phòng |
| **jsPDF trên client** | Không cần server | Font/print không ổn định, dễ bị sửa trước khi hash | ❌ |
| **Upload PDF tự thiết kế** | Linh hoạt | Không đồng nhất, khó đảm bảo brand | 🟡 Fallback |

**Chọn PDFKit** vì:

- Chạy tốt trên Render free.
- Không cần Chromium.
- Kiểm soát layout, font, QR chính xác.
- Sinh file ổn định, dễ test.

---

## 9. Pipeline sinh PDF

### 9.1 Luồng đề xuất

```
FE nhập form
    ↓
POST /api/certificates/prepare
    ↓
BE validate + kiểm tra trùng
    ↓
Sinh PDF (PDFKit) → Buffer
    ↓
SHA-256(buffer) → "sha256:..."
    ↓
Upload Pinata → CID
    ↓
Trả { cid, fileHash, sizeBytes, templateVersion }
    ↓
FE hiện preview (HTML mirror)
    ↓
MetaMask ký issueCertificate(id, hash, cid)
    ↓
POST /api/certificates/confirm { metadata, cid, hash, txHash }
    ↓
BE verify event → lưu DB
```

### 9.2 Vì sao cần bước `prepare`

- PDF phải được sinh **trước** khi ký, vì hash là tham số của tx.
- Không thể sinh sau rồi mới neo hash.
- `prepare` không ghi DB; chỉ tạo file tạm trên IPFS.
- Nếu người dùng hủy, file vẫn nằm trên IPFS (pin) — chấp nhận được với demo, hoặc unpin định kỳ.

### 9.3 API bổ sung

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/certificates/prepare` | `certificateType` + common + `details` | `{ cid, fileHash, sizeBytes, templateId, templateVersion }` |
| POST | `/api/certificates/confirm` | body của prepare + `cid` + `fileHash` + `txHash` | `CertificateIssuer` |

`certificateType` quyết định renderer nào được gọi. `details` là object riêng theo loại.

Nếu giữ luồng upload hiện tại, có thể bỏ `prepare` và dùng `/api/uploads`. Nhưng khi đó template do người dùng tự tạo, không đồng nhất.

### 9.4 Payload theo loại

**Degree**

```json
{
  "certificateType": "degree",
  "certificateId": "UIT-DEG-2026-0001",
  "studentName": "Nguyễn Văn An",
  "studentCode": "2311095",
  "issuedAt": "2026-10-19T08:00:00.000Z",
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

**Course**

```json
{
  "certificateType": "course",
  "certificateId": "UIT-CRS-2026-0142",
  "studentName": "Nguyễn Văn An",
  "studentCode": "2311095",
  "details": {
    "courseCode": "CS409",
    "courseName": "Lập trình Blockchain",
    "credits": 3,
    "semester": "HK1 2025–2026",
    "grade": 8.5,
    "gradeScale": "10",
    "grade4": 3.4,
    "durationHours": 45,
    "instructor": "TS. Trần Văn B"
  }
}
```

**Credit**

```json
{
  "certificateType": "credit",
  "certificateId": "UIT-CRE-2026-0035",
  "studentName": "Nguyễn Văn An",
  "studentCode": "2311095",
  "details": {
    "programName": "Kỹ thuật phần mềm — Khóa 2022–2026",
    "totalCredits": 132,
    "completedCredits": 128,
    "gpa": 3.45,
    "gradeScale": "10",
    "modules": [
      { "code": "CS101", "name": "Nhập môn lập trình", "credits": 4, "grade": 8.5, "grade4": 3.4 },
      { "code": "CS202", "name": "Cấu trúc dữ liệu", "credits": 3, "grade": 8.0, "grade4": 3.2 }
    ]
  }
}
```

**Other**

```json
{
  "certificateType": "other",
  "certificateId": "UIT-OTH-2026-0007",
  "studentName": "Nguyễn Văn An",
  "studentCode": "2311095",
  "details": {
    "title": "CHỨNG NHẬN THAM GIA",
    "description": "đã tham gia và hoàn thành Blockchain Workshop 2026",
    "organizer": "Khoa Công nghệ Thông tin",
    "eventDate": "2026-06-12",
    "role": "Thành viên",
    "result": "Hoàn thành"
  }
}
```

### 9.5 Preview

- Cách 1: FE render HTML cùng layout, dùng dữ liệu form.
- Cách 2: BE trả PDF base64, FE mở trong tab mới.
- Khuyến nghị cách 1 để nhẹ, nhưng phải chấp nhận sai lệch nhỏ so với PDF.

---

## 10. Cấu trúc code backend

```
backend/src/services/certificate-pdf/
├─ index.ts              # generateCertificatePdf(data): dispatch theo loại
├─ registry.ts           # map certificateType -> renderer
├─ types.ts              # discriminated union cho input
├─ common/
│  ├─ layout.ts          # toạ độ, màu, font size dùng chung
│  ├─ frame.ts           # viền, nền, hoa văn góc
│  ├─ header.ts          # logo, tên trường, số chứng chỉ
│  ├─ footer.ts          # QR, link, disclaimer
│  ├─ signature.ts       # chữ ký, con dấu
│  ├─ fonts.ts           # registerFont
│  └─ qr.ts              # generateQrBuffer(url)
├─ templates/
│  ├─ degree.ts          # renderDegree
│  ├─ course.ts          # renderCourse
│  ├─ credit.ts          # renderCredit
│  └─ other.ts           # renderOther
├─ assets/
│  ├─ logo.png
│  ├─ seal.png
│  ├─ signature.png
│  ├─ corner.png
│  └─ fonts/
│     ├─ BeVietnamPro-Regular.ttf
│     ├─ BeVietnamPro-SemiBold.ttf
│     ├─ PlayfairDisplay-Bold.ttf
│     └─ JetBrainsMono-Regular.ttf
└─ template.ts           # TEMPLATE_VERSION
```

### 10.1 Kiểu input — discriminated union

```ts
interface CommonInput {
  certificateId: string;
  studentName: string;
  studentCode: string;
  issuedAt: Date;
  issuerName: string;
  verifyUrl: string;
}

interface DegreeDetails {
  degreeTitle: string;
  major: string;
  graduationYear: number;
  gpa: number;
  classification: string;
  studyMode?: string;
  thesisTitle?: string;
}

interface CourseDetails {
  courseCode: string;
  courseName: string;
  credits: number;
  semester: string;
  grade: number | string;
  gradeScale: '10' | '4' | 'letter';
  grade4?: number;
  durationHours?: number;
  instructor?: string;
}

interface CreditDetails {
  programName: string;
  totalCredits: number;
  completedCredits: number;
  gpa?: number;
  gradeScale: '10' | '4' | 'letter';
  modules?: Array<{
    code: string;
    name: string;
    credits: number;
    grade: number | string;
    grade4?: number;
  }>;
}

interface OtherDetails {
  title: string;
  description: string;
  organizer?: string;
  eventDate?: string;
  role?: string;
  result?: string;
  validUntil?: string;
}

type CertificatePdfInput =
  | ({ certificateType: 'degree' } & CommonInput & { details: DegreeDetails })
  | ({ certificateType: 'course' } & CommonInput & { details: CourseDetails })
  | ({ certificateType: 'credit' } & CommonInput & { details: CreditDetails })
  | ({ certificateType: 'other' } & CommonInput & { details: OtherDetails });
```

### 10.2 Registry

```ts
type Renderer<T extends CertificatePdfInput = CertificatePdfInput> =
  (doc: PDFKit.PDFDocument, input: T) => void;

const registry: Record<CertificateType, Renderer> = {
  degree: renderDegree,
  course: renderCourse,
  credit: renderCredit,
  other: renderOther,
};

export async function generateCertificatePdf(input: CertificatePdfInput) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
  drawFrame(doc);
  drawHeader(doc, input);
  registry[input.certificateType](doc, input as never);
  drawSignature(doc, input);
  drawFooter(doc, input);
  // ... trả Buffer
}
```

**Quy tắc:** mỗi template chỉ vẽ **phần nội dung**. Khung, header, footer, QR do lớp common đảm nhiệm — tránh lệch giữa 4 loại.

### 10.3 Validation theo loại

Dùng zod **discriminated union** để không cho gửi field sai loại:

```ts
const degreeSchema = z.object({
  certificateType: z.literal('degree'),
  certificateId: z.string().regex(/^UIT-DEG-\d{4}-\d{4}$/),
  details: z.object({
    degreeTitle: z.string().min(2).max(50),
    major: z.string().min(2).max(100),
    graduationYear: z.number().int().min(2000).max(2100),
    gpa: z.number().min(0).max(4),
    classification: z.string().min(2).max(50),
    studyMode: z.string().max(50).optional(),
    thesisTitle: z.string().max(200).optional(),
  }),
});
```

**Quy tắc chéo:**

| Loại | Quy tắc |
|---|---|
| `degree` | GPA bắt buộc, 0–4; năm 2000–2100 |
| `course` | `credits` 1–10; `grade` khớp `gradeScale`: hệ 10 → 0–10, hệ 4 → 0–4, chữ → A–F |
| `credit` | `completedCredits` ≤ `totalCredits`; modules ≤ 8; grade khớp `gradeScale` |
| `grade4` (nếu có) | 0–4 |
| `other` | `title` không rỗng; `validUntil` > `issuedAt` nếu có |
| Tất cả | `certificateId` đúng prefix của loại |

**Mã chứng chỉ:**

```
^UIT-(DEG|CRS|CRE|OTH)-\d{4}-\d{4}$
```

Backend tự kiểm tra prefix khớp `certificateType`. Nếu không khớp → `VALIDATION_ERROR`.

### 10.4 Ảnh hưởng tới DB & API

**MongoDB — thêm vào `certificates`:**

| Field | Kiểu | Ghi chú |
|---|---|---|
| `certificateType` | enum `degree\|course\|credit\|other` | bắt buộc, index |
| `details` | object | schema riêng theo loại |
| `templateId` | string | `degree-v1`, `course-v1`… |
| `templateVersion` | string | `1.0.0` |

Index bổ sung:

```js
{ certificateType: 1, issuedAt: -1 }
```

**API:**

- `POST /certificates/prepare`: nhận `certificateType` + `details`.
- `POST /certificates/confirm`: cùng body + tx.
- `GET /public/certificates`: thêm filter `type`.
- `GET /public/filters`: thêm `types`.
- DTO `CertificateSummary` / `CertificateDetail`: thêm `certificateType`, `details`.

**Frontend:**

- Form cấp chứng chỉ: **bước 0 chọn loại**.
- Các field hiển thị động theo loại.
- Kết quả search có badge loại.
- Trang `/c/[id]` render khối chi tiết theo loại.
- Preview HTML phải đổi layout theo loại.

**Contract:** không đổi. Loại chứng chỉ nằm trong PDF và metadata; hash PDF đã neo on-chain nên loại cũng được bảo vệ gián tiếp.

---

## 11. Metadata PDF

Đặt cố định để dễ test và tránh lộ thông tin thừa:

```ts
const SUBJECT: Record<CertificateType, string> = {
  degree: 'Chứng nhận tốt nghiệp',
  course: 'Chứng chỉ hoàn thành khóa học',
  credit: 'Chứng nhận tín chỉ',
  other: 'Chứng nhận',
};

doc.info = {
  Title: `Chứng nhận ${data.certificateId}`,
  Author: data.issuerName,
  Subject: SUBJECT[data.certificateType],
  Keywords: `${data.certificateType},${data.certificateId}`,
  CreationDate: data.issuedAt,
  ModDate: data.issuedAt,
  Producer: 'VerifyCert/1.0',
  Creator: 'VerifyCert',
};
```

**Lưu ý:** PDFKit mặc định gắn thời gian hiện tại. Nếu muốn file **deterministic** (cùng input → cùng hash), phải ghi đè `CreationDate`/`ModDate` bằng `issuedAt`.

Không bắt buộc deterministic vì hash chỉ tính một lần trên file thật. Nhưng nên làm để test ổn định.

---

## 12. Font & tiếng Việt

- Phải nhúng font, không dựa vào font hệ thống.
- Kiểm tra dấu: `Nguyễn Văn An`, `Đặng Đình Đức`, `Lê Thị Hồng`.
- Playfair Display có subset tiếng Việt; nếu thiếu glyph, dùng Be Vietnam Pro cho cả tiêu đề.
- Không dùng font không bản quyền.

**Test nhanh:**

```
Nguyễn Văn An
Đặng Đình Đức
Lê Thị Hồng
Trần Quốc Cường
```

Nếu dấu bị vuông hoặc lệch, đổi font.

---

## 13. Tài sản thiết kế

| Asset | Định dạng | Kích thước | Ghi chú |
|---|---|---|---|
| Logo trường | PNG trong suốt | 600×600 | 300 DPI |
| Con dấu | PNG trong suốt | 800×800 | đỏ, opacity 85% |
| Chữ ký | PNG trong suốt | 600×300 | mực xanh/đen |
| Hoa văn góc | PNG/SVG | 200×200 | vàng |
| Font | TTF | — | nhúng |
| QR | sinh động | 25mm | error M |

---

## 14. Biến thể

### 14.1 PDF (bản gốc)

- Artifact duy nhất được neo hash.
- Tải từ IPFS.
- Không chỉnh sửa.

### 14.2 Trang `/c/[id]` (bản xem)

- Render HTML từ metadata + chain.
- Có thể thiết kế giống PDF nhưng **không phải** artifact.
- Hiển thị trạng thái động, txHash, nút tải PDF.

### 14.3 Ảnh preview (tùy chọn)

- Chỉ để chia sẻ mạng xã hội.
- Không neo hash.
- Ghi rõ “bản xem trước”.

---

## 15. Kiểm thử

### 15.1 Nội dung

- [ ] Tên trường, logo đúng
- [ ] Họ tên, MSSV khớp form
- [ ] Ngày cấp đúng
- [ ] Số chứng chỉ đúng prefix loại
- [ ] Link tra cứu đúng domain
- [ ] Không có trạng thái “còn hiệu lực”
- [ ] Không có hash/txHash
- [ ] GPA luôn hiển thị `/4`
- [ ] Điểm môn luôn kèm đơn vị (`/10`, `/4` hoặc chữ)
- [ ] Không có điểm trần gây hiểu nhầm hệ nào

### 15.1.1 Theo loại

| Loại | Kiểm tra |
|---|---|
| `degree` | Ngành, năm, GPA 0–4, xếp loại, học chế |
| `course` | Tên khóa, mã môn, tín chỉ, học kỳ, điểm, thời lượng |
| `credit` | Chương trình, tổng tín chỉ, đã tích lũy, bảng môn ≤ 8 dòng |
| `other` | Tiêu đề tùy chỉnh, mô tả ≤ 3 dòng, tổ chức, thời gian |

### 15.2 Hình thức

- [ ] In A4 ngang không cắt viền
- [ ] Chữ Việt có dấu đầy đủ
- [ ] QR quét được
- [ ] Ảnh không vỡ khi in 300 DPI
- [ ] Màu đúng palette
- [ ] File < 500KB

### 15.3 Kỹ thuật

- [ ] `sha256(buffer)` đúng format
- [ ] Cùng input → cùng hash (nếu đã cố định metadata)
- [ ] PDF mở được trên Chrome, Edge, Adobe
- [ ] Không lỗi font khi máy không cài font

---

## 16. Versioning

- Mỗi loại có version riêng:

```
degree-v1.0.0
course-v1.0.0
credit-v1.0.0
other-v1.0.0
```

- Lưu `templateId` + `templateVersion` vào DB.
- Không template nào được sửa sau khi đã cấp chứng chỉ — PDF cũ vẫn là artifact gốc.
- Nếu đổi thiết kế, tăng version; chứng chỉ cũ giữ nguyên.
- Không cần re-render PDF cũ khi template đổi.

---

## 17. Lộ trình 5 ngày

| Ngày | Việc | Kết quả |
|---|---|---|
| 1 | Khung chung, asset, font, QR, template `degree` | PDF degree hoàn chỉnh |
| 2 | Template `course` + `credit` | 3 loại chạy |
| 3 | Template `other` + validation theo loại | 4 loại chạy |
| 4 | Tích hợp `prepare`/`confirm`, hash, Pinata | Cấp được cert tự động |
| 5 | Test in, QR, tiếng Việt, versioning | PDF hoàn chỉnh |

---

## 18. Rủi ro

| Rủi ro | Ảnh hưởng | Xử lý |
|---|---|---|
| Font thiếu glyph tiếng Việt | Dấu thành ô vuông | Nhúng font, test 4 tên mẫu |
| PDFKit lệch layout | In bị cắt | Dùng toạ độ pt, test A4 |
| QR quá nhỏ | Không quét được | Tối thiểu 25mm |
| In trạng thái vào PDF | Sai sau revoke | Không in badge |
| In hash vào PDF | Bất khả thi | Dùng QR + link |
| File quá lớn | Tốn Pinata | Nén ảnh, font subset |
| Không deterministic | Test hash khó | Cố định metadata |
| Sửa template sau khi cấp | Hash cũ vẫn đúng nhưng lệch thiết kế | Versioning |
| 4 layout lệch nhau | Mất nhận diện thương hiệu | Dùng chung frame/header/footer |
| Gửi field sai loại | PDF thiếu dữ liệu | zod discriminated union |
| Bảng tín chỉ quá dài | Tràn trang | Giới hạn 8 dòng, phần còn lại dùng bảng điểm riêng |

---

## 19. Checklist hoàn thành

- [ ] Layout A4 ngang chốt
- [ ] Asset đủ, đúng DPI
- [ ] Font nhúng, tiếng Việt chuẩn
- [ ] QR trỏ đúng `/c/[id]`
- [ ] Không in trạng thái/hash/txHash
- [ ] 4 template: `degree`, `course`, `credit`, `other`
- [ ] Mã chứng chỉ đúng prefix từng loại
- [ ] Validation discriminated union
- [ ] Sinh PDF từ dữ liệu thật
- [ ] Hash + upload + tx hoạt động
- [ ] In thử A4 đạt
- [ ] Quét QR đạt
- [ ] `templateId` + `templateVersion` lưu DB
- [ ] Search/detail hiển thị đúng loại
