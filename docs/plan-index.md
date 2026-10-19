# Danh mục kế hoạch — Verify Certification

> Cập nhật lần cuối: sau khi hoàn thành plan Smart Contract, Database, Backend, Frontend.

---

## 1. Đã có

| # | Tài liệu | Nội dung | Trạng thái |
|---|---|---|---|
| 1 | [ke-hoach-verify-certification.md](ke-hoach-verify-certification.md) | Kế hoạch tổng thể, kiến trúc, công nghệ, chi phí, lộ trình 6 tuần | ✅ |
| 2 | [checklist-trien-khai.md](checklist-trien-khai.md) | 181 đầu việc theo module, mức ưu tiên P0/P1/P2 | ✅ |
| 3 | [smart-contract-design.md](smart-contract-design.md) | Phân tích thiết kế contract, actor, dữ liệu, bảo mật | ✅ |
| 4 | [smart-contract-plan.md](smart-contract-plan.md) | Danh sách contract, hàm, test 30 case, deploy, lộ trình 2 ngày | ✅ |
| 5 | [database-schema-design.md](database-schema-design.md) | 6 collection, index, validator, search, widget recent | ✅ |
| 6 | [backend-plan.md](backend-plan.md) | API, model, auth, upload, verify tx, sync, deploy, 8 ngày | ✅ |
| 7 | [frontend-plan.md](frontend-plan.md) | Sitemap, trang, component, màu sắc, search kiểu Google, 7 ngày | ✅ |
| 8 | [integration-api-contract.md](integration-api-contract.md) | DTO, endpoint, mã lỗi, sequence diagram, mapping 3 tầng | ✅ |
| 9 | [testing-qa-plan.md](testing-qa-plan.md) | Test 5 tầng, 18 E2E, dữ liệu mẫu, bug process, smoke test | ✅ |
| 10 | [deployment-runbook.md](deployment-runbook.md) | Thứ tự deploy, env matrix, rollback, sự cố, demo day | ✅ |
| 11 | [certificate-template-plan.md](certificate-template-plan.md) | 4 loại template, layout A4, PDFKit, QR, quy ước điểm | ✅ |
| 12 | [security-privacy-plan.md](security-privacy-plan.md) | STRIDE, risk register, khóa, PII, OWASP, ứng cứu | ✅ |
| 13 | [cicd-plan.md](cicd-plan.md) | GitHub Actions, branch protection, deploy contract thủ công | ✅ |

### Cấu hình đã tạo

| File | Nội dung |
|---|---|
| `../.env`, `../.env.example` | Biến môi trường tổng hợp |
| `../contracts/.env` | RPC, Etherscan, private key |
| `../backend/.env` | Mongo, JWT, Pinata, contract |
| `../frontend/.env.local` | Chỉ `NEXT_PUBLIC_*` |
| `../backend/Dockerfile` | Node 24.21.0, multi-stage |
| `../backend/.dockerignore` | Loại secret khỏi image |
| `../render.yaml` | Render Blueprint cho service Docker |
| `../.gitignore` | Chặn `.env`, build artifacts |
| [remix-deploy-guide.md](remix-deploy-guide.md) | Hướng dẫn deploy contract bằng Remix + MetaMask |

---

## 2. Còn thiếu

| # | Kế hoạch | Vì sao cần | Ưu tiên |
|---|---|---|---|
| 14 | **Demo & Defense** | Kịch bản 7 phút, slide, video dự phòng, câu hỏi phản biện | 🔴 P0 |
| 15 | **Seed & Demo Data** | Bao nhiêu issuer/SV/chứng chỉ, case revoked, file giả mạo | 🟠 P1 |
| 16 | **Git & Coding Conventions** | Nhánh, commit message, PR, format, review checklist | 🟡 P2 |
| 17 | **Report Outline** | Cấu trúc báo cáo môn học, map với deliverable | 🟡 P2 |
| 18 | **Operations & Monitoring** | Uptime, log, backup Atlas, cảnh báo, chi phí | 🟡 P2 |

> Ghi chú: Testing & QA đã bao gồm smoke test và một phần vận hành; Deployment Runbook đã bao gồm rollback, sự cố và demo day. Các mục 12–17 chỉ cần bổ sung nếu còn thời gian.

---

## 3. Thứ tự đề xuất

```
Code: Contract → Backend → Frontend
        ↓
Integration & API Contract (đã có, dùng khi nối)
        ↓
Testing & QA  ←→  Seed & Demo Data
        ↓
Deployment Runbook
        ↓
Demo & Defense
        ↓
Security & Privacy (song song)
        ↓
Certificate Template (song song)
        ↓
Git Conventions / Report / Ops
```

Hiện đã đủ tài liệu để code và triển khai. Việc còn lại chủ yếu là **thực thi**, không phải viết thêm plan.

---

## 4. Việc có thể bắt đầu ngay

| Việc | Phụ thuộc |
|---|---|
| Smart contract | Không — có thể code/test local ngay |
| Backend skeleton + `/api/health` | Không — chưa cần contract |
| Frontend layout + search UI (mock) | Không — dùng mock data |
| API contract | Cần chốt DTO trước khi code tích hợp |
| Testing plan | Cần API contract |
| Deployment runbook | Cần biết URL Render/Vercel thật |

---

## 5. Ghi chú

- Các plan hiện tại đã đủ chi tiết để code từng module.
- Phần còn thiếu chủ yếu là **kết nối giữa các module**, **kiểm thử**, **vận hành** và **bảo vệ**.
- Không nên làm thêm plan mới trước khi bắt đầu code; chỉ cần bổ sung khi tích hợp.
