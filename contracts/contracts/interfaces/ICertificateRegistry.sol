// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

/// @title ICertificateRegistry
/// @notice Giao diện chuẩn cho sổ đăng ký chứng chỉ của một trường.
/// @dev Chỉ khai báo kiểu dữ liệu, event và hàm. Không chứa logic.
interface ICertificateRegistry {
    // ---------------------------------------------------------------------
    // Kiểu dữ liệu
    // ---------------------------------------------------------------------

    /// @notice Chứng chỉ được neo on-chain.
    /// @param certificateId Mã chứng chỉ, duy nhất, ví dụ "UIT-DEG-2026-0001".
    /// @param fileHash SHA-256 của file PDF gốc, dạng "sha256:<hex>".
    /// @param ipfsCid CID của file PDF trên IPFS.
    /// @param issuer Địa chỉ ví đã cấp chứng chỉ.
    /// @param issuedAt Thời điểm cấp (giây UNIX).
    /// @param isRevoked Đã bị thu hồi vĩnh viễn hay chưa.
    /// @param isLocked Đang bị tạm khoá hay không.
    struct Certificate {
        string certificateId;
        string fileHash;
        string ipfsCid;
        address issuer;
        uint64 issuedAt;
        bool isRevoked;
        bool isLocked;
    }

    /// @notice Đơn vị được phép cấp chứng chỉ (khoa, phòng ban).
    /// @param name Tên đơn vị.
    /// @param active Còn quyền cấp chứng chỉ hay không.
    /// @param addedAt Thời điểm được thêm (giây UNIX).
    struct Issuer {
        string name;
        bool active;
        uint64 addedAt;
    }

    // ---------------------------------------------------------------------
    // Event
    // ---------------------------------------------------------------------

    event CertificateIssued(
        bytes32 indexed idHash,
        string certificateId,
        string fileHash,
        address indexed issuer,
        uint64 issuedAt
    );

    event CertificateRevoked(
        bytes32 indexed idHash,
        address indexed issuer,
        uint64 revokedAt
    );

    event CertificateLocked(
        bytes32 indexed idHash,
        address indexed issuer,
        uint64 lockedAt
    );

    event CertificateUnlocked(
        bytes32 indexed idHash,
        address indexed issuer,
        uint64 unlockedAt
    );

    event IssuerUpdated(address indexed issuer, string name, bool active);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ---------------------------------------------------------------------
    // Quản trị
    // ---------------------------------------------------------------------

    function owner() external view returns (address);

    function totalCertificates() external view returns (uint256);

    function issuedCount(address issuer) external view returns (uint256);

    function addIssuer(address who, string calldata name) external;

    function removeIssuer(address who) external;

    function transferOwnership(address newOwner) external;

    // ---------------------------------------------------------------------
    // Nghiệp vụ
    // ---------------------------------------------------------------------

    function issueCertificate(
        string calldata certificateId,
        string calldata fileHash,
        string calldata ipfsCid
    ) external;

    function revokeCertificate(string calldata certificateId) external;

    function lockCertificate(string calldata certificateId) external;

    function unlockCertificate(string calldata certificateId) external;

    // ---------------------------------------------------------------------
    // Truy vấn
    // ---------------------------------------------------------------------

    function getCertificate(string calldata certificateId)
        external
        view
        returns (Certificate memory);

    function getIssuer(address who) external view returns (Issuer memory);

    function verifyByHash(string calldata fileHash)
        external
        view
        returns (
            bool exists,
            bool valid,
            string memory certificateId,
            address issuer,
            uint64 issuedAt
        );

    function isValid(string calldata certificateId) external view returns (bool);
}
