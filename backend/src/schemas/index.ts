/**
 * @file index.ts
 * @description Điểm tập trung xuất bản (Barrel File / Entry Point) cho toàn bộ lớp Schema xác thực dữ liệu.
 * 
 * Áp dụng mẫu thiết kế Barrel Pattern nhằm:
 * 1. Đóng gói kiến trúc mô-đun (Encapsulation): Cung cấp một giao diện nhập/xuất duy nhất (Unified Public API)
 *    cho các Controllers, Middlewares và Services mà không cần tham chiếu sâu vào từng file con.
 * 2. Tái xuất bản toàn diện (Comprehensive Re-export):
 *    - `auth`: Xác thực đăng nhập kết hợp Web2 & Web3 (loginSchema, LoginInput).
 *    - `certificate`: Nghiệp vụ vòng đời văn bằng, xác thực đa hình, phát hành On-chain & IPFS.
 *    - `common`: Các kiểu dữ liệu nguyên tử (EVM Wallet, TxHash, SHA-256 Hash, CID, ObjectId, Pagination, Enums).
 *    - `issuer`: Quản lý đơn vị cấp phát, phương thức onboarding kép (userId vs email/password).
 *    - `public`: Tra cứu công khai, xác minh bằng chứng chỉ qua mã băm và mã sinh viên.
 * 3. Hỗ trợ IntelliSense & Tree-shaking: Giúp IDE gợi ý mã nguồn tự động và tối ưu hóa gói bundle khi biên dịch.
 */

/** Xuất bản các schema và kiểu dữ liệu liên quan đến đăng nhập và xác thực */
export * from "./auth";

/** Xuất bản các schema quản lý văn bằng, xác thực đa hình và chứng từ phát hành */
export * from "./certificate";

/** Xuất bản các kiểu dữ liệu nguyên tử, định dạng Web3, phân trang và các Enums dùng chung */
export * from "./common";

/** Xuất bản các schema quản lý đơn vị cấp phát chứng chỉ (Issuers) */
export * from "./issuer";

/** Xuất bản các schema phục vụ cổng tra cứu và thẩm định công khai (Public Verification) */
export * from "./public";
