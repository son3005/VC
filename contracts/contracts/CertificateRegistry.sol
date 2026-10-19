// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {ICertificateRegistry} from "./interfaces/ICertificateRegistry.sol";

/// @title CertificateRegistry
/// @notice Sổ đăng ký chứng chỉ của một trường trên Ethereum.
/// @dev Một owner duy nhất (phòng đào tạo), nhiều issuer (khoa/phòng ban).
///      Không lưu PII on-chain; chỉ lưu mã, hash file, CID, ví cấp, thời gian, trạng thái.
contract CertificateRegistry is ICertificateRegistry {
    // ---------------------------------------------------------------------
    // Hằng số
    // ---------------------------------------------------------------------

    string public constant VERSION = "1.0.0";

    uint256 public constant MAX_ID_LEN = 64;
    uint256 public constant MAX_HASH_LEN = 80;
    uint256 public constant MAX_CID_LEN = 100;
    uint256 public constant MAX_NAME_LEN = 100;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    address private _owner;
    uint256 private _totalCertificates;

    mapping(address => uint256) private _issuedCount;
    mapping(address => Issuer) private _issuers;
    mapping(bytes32 => Certificate) private _certificates;
    mapping(bytes32 => bytes32) private _hashToCert;

    // ---------------------------------------------------------------------
    // Lỗi
    // ---------------------------------------------------------------------

    error NotOwner();
    error NotIssuer();
    error ZeroAddress();
    error EmptyField();
    error FieldTooLong();
    error CertificateExists();
    error CertificateNotFound();
    error HashAlreadyUsed();
    error AlreadyRevoked();
    error InvalidOwnershipTransfer();

    // ---------------------------------------------------------------------
    // Modifier
    // ---------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != _owner) revert NotOwner();
        _;
    }

    modifier onlyActiveIssuer() {
        if (!_issuers[msg.sender].active) revert NotIssuer();
        _;
    }

    // ---------------------------------------------------------------------
    // Khởi tạo
    // ---------------------------------------------------------------------

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ---------------------------------------------------------------------
    // Quản trị
    // ---------------------------------------------------------------------

    /// @inheritdoc ICertificateRegistry
    function owner() external view override returns (address) {
        return _owner;
    }

    /// @inheritdoc ICertificateRegistry
    function totalCertificates() external view override returns (uint256) {
        return _totalCertificates;
    }

    /// @inheritdoc ICertificateRegistry
    function issuedCount(address issuer) external view override returns (uint256) {
        return _issuedCount[issuer];
    }

    /// @notice Thêm mới hoặc kích hoạt lại một đơn vị cấp chứng chỉ.
    /// @dev Gỡ issuer không làm mất hiệu lực các chứng chỉ đã cấp.
    function addIssuer(address who, string calldata name) external override onlyOwner {
        if (who == address(0)) revert ZeroAddress();

        uint256 nameLen = bytes(name).length;
        if (nameLen == 0) revert EmptyField();
        if (nameLen > MAX_NAME_LEN) revert FieldTooLong();

        Issuer storage issuer = _issuers[who];

        // Giữ nguyên addedAt gốc nếu issuer đã từng tồn tại.
        if (issuer.addedAt == 0) {
            issuer.addedAt = uint64(block.timestamp);
        }

        issuer.name = name;
        issuer.active = true;

        emit IssuerUpdated(who, name, true);
    }

    /// @notice Gỡ quyền cấp chứng chỉ của một đơn vị.
    /// @dev Chứng chỉ cũ vẫn tra cứu bình thường.
    function removeIssuer(address who) external override onlyOwner {
        Issuer storage issuer = _issuers[who];
        if (issuer.addedAt == 0 || !issuer.active) revert NotIssuer();

        issuer.active = false;

        emit IssuerUpdated(who, issuer.name, false);
    }

    /// @notice Chuyển quyền owner sang ví khác.
    function transferOwnership(address newOwner) external override onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        if (newOwner == _owner) revert InvalidOwnershipTransfer();

        address previousOwner = _owner;
        _owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    // ---------------------------------------------------------------------
    // Nghiệp vụ
    // ---------------------------------------------------------------------

    /// @notice Cấp một chứng chỉ mới.
    /// @param certificateId Mã chứng chỉ, duy nhất.
    /// @param fileHash SHA-256 của file PDF, dạng "sha256:<hex>".
    /// @param ipfsCid CID của file PDF trên IPFS.
    function issueCertificate(
        string calldata certificateId,
        string calldata fileHash,
        string calldata ipfsCid
    ) external override onlyActiveIssuer {
        _requireNonEmptyWithin(certificateId, MAX_ID_LEN);
        _requireNonEmptyWithin(fileHash, MAX_HASH_LEN);
        _requireNonEmptyWithin(ipfsCid, MAX_CID_LEN);

        bytes32 idKey = keccak256(bytes(certificateId));
        if (_certificates[idKey].issuer != address(0)) revert CertificateExists();

        bytes32 hashKey = keccak256(bytes(fileHash));
        if (_hashToCert[hashKey] != bytes32(0)) revert HashAlreadyUsed();

        uint64 issuedAt = uint64(block.timestamp);

        _certificates[idKey] = Certificate({
            certificateId: certificateId,
            fileHash: fileHash,
            ipfsCid: ipfsCid,
            issuer: msg.sender,
            issuedAt: issuedAt,
            isRevoked: false
        });

        _hashToCert[hashKey] = idKey;
        _totalCertificates += 1;
        _issuedCount[msg.sender] += 1;

        emit CertificateIssued(idKey, certificateId, fileHash, msg.sender, issuedAt);
    }

    /// @notice Thu hồi một chứng chỉ.
    /// @dev Chỉ issuer đã cấp hoặc owner được thu hồi. Không xóa dữ liệu.
    function revokeCertificate(string calldata certificateId) external override {
        bytes32 idKey = keccak256(bytes(certificateId));
        Certificate storage cert = _certificates[idKey];

        if (cert.issuer == address(0)) revert CertificateNotFound();
        if (cert.isRevoked) revert AlreadyRevoked();
        if (msg.sender != cert.issuer && msg.sender != _owner) revert NotIssuer();

        cert.isRevoked = true;

        // Event ghi nhận issuer của chứng chỉ; owner thu hồi là ngoại lệ.
        emit CertificateRevoked(idKey, cert.issuer, uint64(block.timestamp));
    }

    // ---------------------------------------------------------------------
    // Truy vấn
    // ---------------------------------------------------------------------

    /// @inheritdoc ICertificateRegistry
    function getCertificate(string calldata certificateId)
        external
        view
        override
        returns (Certificate memory)
    {
        Certificate memory cert = _certificates[keccak256(bytes(certificateId))];
        if (cert.issuer == address(0)) revert CertificateNotFound();
        return cert;
    }

    /// @inheritdoc ICertificateRegistry
    function getIssuer(address who) external view override returns (Issuer memory) {
        return _issuers[who];
    }

    /// @inheritdoc ICertificateRegistry
    function verifyByHash(string calldata fileHash)
        external
        view
        override
        returns (
            bool exists,
            bool valid,
            string memory certificateId,
            address issuer,
            uint64 issuedAt
        )
    {
        bytes32 idKey = _hashToCert[keccak256(bytes(fileHash))];
        if (idKey == bytes32(0)) {
            return (false, false, "", address(0), 0);
        }

        Certificate storage cert = _certificates[idKey];
        if (cert.issuer == address(0)) {
            return (false, false, "", address(0), 0);
        }

        return (true, !cert.isRevoked, cert.certificateId, cert.issuer, cert.issuedAt);
    }

    /// @inheritdoc ICertificateRegistry
    function isValid(string calldata certificateId) external view override returns (bool) {
        Certificate storage cert = _certificates[keccak256(bytes(certificateId))];
        return cert.issuer != address(0) && !cert.isRevoked;
    }

    // ---------------------------------------------------------------------
    // Nội bộ
    // ---------------------------------------------------------------------

    /// @dev Yêu cầu chuỗi không rỗng và không vượt quá độ dài cho phép.
    function _requireNonEmptyWithin(string calldata value, uint256 maxLen) private pure {
        uint256 len = bytes(value).length;
        if (len == 0) revert EmptyField();
        if (len > maxLen) revert FieldTooLong();
    }
}
