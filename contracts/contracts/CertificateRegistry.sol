// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {ICertificateRegistry} from "./interfaces/ICertificateRegistry.sol";

/// @title CertificateRegistry
/// @notice Sổ đăng ký chứng chỉ của một trường trên Ethereum.
/// @dev Một owner duy nhất (phòng đào tạo), nhiều issuer (khoa/phòng ban).
///      Không lưu PII on-chain; chỉ lưu mã, hash file, CID, ví cấp, thời gian, trạng thái.
contract CertificateRegistry is ICertificateRegistry {
    // ---------------------------------------------------------------------
    // Hằng số (constant: lưu trực tiếp trong bytecode, không tốn slot storage)
    // ---------------------------------------------------------------------

    string public constant VERSION = "1.0.0"; // Phiên bản contract, tự sinh hàm getter VERSION()

    uint256 public constant MAX_ID_LEN = 64; // Độ dài tối đa của mã chứng chỉ (64 bytes)
    uint256 public constant MAX_HASH_LEN = 80; // Độ dài tối đa của chuỗi fileHash ("sha256:" + 64 hex = 71 bytes)
    uint256 public constant MAX_CID_LEN = 100; // Độ dài tối đa của IPFS CID
    uint256 public constant MAX_NAME_LEN = 100; // Độ dài tối đa của tên đơn vị cấp (bytes)

    // ---------------------------------------------------------------------
    // Storage (dữ liệu lưu vĩnh viễn trên blockchain)
    // ---------------------------------------------------------------------

    address private _owner; // Địa chỉ ví quản trị cao nhất (Phòng đào tạo)
    uint256 private _totalCertificates; // Tổng số chứng chỉ đã được cấp trên toàn hợp đồng

    mapping(address => uint256) private _issuedCount; // Đếm số lượng chứng chỉ mỗi ví issuer đã cấp
    mapping(address => Issuer) private _issuers; // Thông tin đơn vị cấp theo địa chỉ ví
    mapping(bytes32 => Certificate) private _certificates; // Dữ liệu chứng chỉ theo key = keccak256(certificateId)
    mapping(bytes32 => bytes32) private _hashToCert; // Ánh xạ keccak256(fileHash) -> idKey để tra cứu O(1) và chống trùng file

    // ---------------------------------------------------------------------
    // Lỗi tùy chỉnh (Custom Error: tiết kiệm gas hơn require(..., "chuỗi lỗi"))
    // ---------------------------------------------------------------------

    error NotOwner(); // Người gọi không phải owner của contract
    error NotIssuer(); // Người gọi không phải issuer hợp lệ hoặc không có quyền trên chứng chỉ
    error ZeroAddress(); // Địa chỉ ví truyền vào là 0x0000...0000
    error EmptyField(); // Chuỗi bắt buộc bị bỏ trống (độ dài = 0)
    error FieldTooLong(); // Chuỗi vượt quá độ dài tối đa cho phép
    error CertificateExists(); // Mã chứng chỉ đã tồn tại on-chain
    error CertificateNotFound(); // Không tìm thấy chứng chỉ theo mã đã nhập
    error HashAlreadyUsed(); // File PDF (fileHash) này đã được dùng cho một chứng chỉ khác
    error AlreadyRevoked(); // Chứng chỉ đã bị thu hồi vĩnh viễn trước đó
    error AlreadyLocked(); // Chứng chỉ đang ở trạng thái tạm khoá
    error NotLocked(); // Chứng chỉ không ở trạng thái tạm khoá nên không thể mở khoá
    error InvalidOwnershipTransfer(); // Chuyển quyền owner cho chính owner hiện tại

    // ---------------------------------------------------------------------
    // Modifier (bộ kiểm tra điều kiện chạy trước thân hàm)
    // ---------------------------------------------------------------------

    modifier onlyOwner() {
        // Kiểm tra người gọi (msg.sender) có đúng là _owner không; nếu sai thì dừng và hoàn tác giao dịch
        if (msg.sender != _owner) revert NotOwner();
        _; // Vị trí chèn phần thân của hàm sử dụng modifier này
    }

    modifier onlyActiveIssuer() {
        // Kiểm tra ví gọi hàm có đang được cấp quyền active trong mapping _issuers không
        if (!_issuers[msg.sender].active) revert NotIssuer();
        _;
    }

    // ---------------------------------------------------------------------
    // Khởi tạo (chạy duy nhất 1 lần khi deploy contract lên blockchain)
    // ---------------------------------------------------------------------

    constructor() {
        _owner = msg.sender; // Gán ví deploy contract làm owner đầu tiên
        emit OwnershipTransferred(address(0), msg.sender); // Phát log ghi nhận quyền sở hữu khởi tạo từ địa chỉ 0
    }

    // ---------------------------------------------------------------------
    // Quản trị
    // ---------------------------------------------------------------------

    /// @inheritdoc ICertificateRegistry
    function owner() external view override returns (address) {
        return _owner; // Trả về địa chỉ ví quản trị hiện tại (hàm view không tốn gas khi gọi đọc)
    }

    /// @inheritdoc ICertificateRegistry
    function totalCertificates() external view override returns (uint256) {
        return _totalCertificates; // Trả về tổng số chứng chỉ đã phát hành
    }

    /// @inheritdoc ICertificateRegistry
    function issuedCount(address issuer) external view override returns (uint256) {
        return _issuedCount[issuer]; // Trả về số lượng chứng chỉ mà ví issuer đã cấp
    }

    /// @notice Thêm mới hoặc kích hoạt lại một đơn vị cấp chứng chỉ.
    /// @dev Gỡ issuer không làm mất hiệu lực các chứng chỉ đã cấp.
    function addIssuer(address who, string calldata name) external override onlyOwner {
        // 1. Không chấp nhận địa chỉ ví rỗng 0x000...000
        if (who == address(0)) revert ZeroAddress();

        // 2. Đo độ dài chuỗi tên theo số byte (UTF-8) và kiểm tra rỗng / vượt ngưỡng
        uint256 nameLen = bytes(name).length;
        if (nameLen == 0) revert EmptyField();
        if (nameLen > MAX_NAME_LEN) revert FieldTooLong();

        // 3. Lấy con trỏ `storage` trỏ trực tiếp tới struct Issuer trong mapping _issuers để sửa trực tiếp on-chain
        Issuer storage issuer = _issuers[who];

        // 4. Giữ nguyên addedAt gốc nếu issuer đã từng tồn tại (khi mở khoá hoặc đổi tên); chỉ gán lần đầu khi addedAt == 0
        if (issuer.addedAt == 0) {
            issuer.addedAt = uint64(block.timestamp); // Ép kiểu timestamp của block hiện tại sang uint64
        }

        // 5. Cập nhật tên đơn vị và bật trạng thái active = true
        issuer.name = name;
        issuer.active = true;

        // 6. Phát sự kiện để Backend/Indexer đồng bộ vào MongoDB
        emit IssuerUpdated(who, name, true);
    }

    /// @notice Gỡ quyền cấp chứng chỉ của một đơn vị.
    /// @dev Chứng chỉ cũ vẫn tra cứu bình thường.
    function removeIssuer(address who) external override onlyOwner {
        // 1. Lấy tham chiếu storage của issuer cần khoá
        Issuer storage issuer = _issuers[who];
        // 2. Từ chối nếu ví chưa từng được thêm (addedAt == 0) hoặc đã bị khoá sẵn (!active)
        if (issuer.addedAt == 0 || !issuer.active) revert NotIssuer();

        // 3. Khoá mềm: chỉ tắt cờ active, không xóa dữ liệu để giữ lịch sử
        issuer.active = false;

        // 4. Phát sự kiện cập nhật trạng thái active = false
        emit IssuerUpdated(who, issuer.name, false);
    }

    /// @notice Chuyển quyền owner sang ví khác.
    function transferOwnership(address newOwner) external override onlyOwner {
        // 1. Chặn địa chỉ ví 0x0 và chặn chuyển cho chính owner hiện tại
        if (newOwner == address(0)) revert ZeroAddress();
        if (newOwner == _owner) revert InvalidOwnershipTransfer();

        // 2. Lưu lại owner cũ để emit event, sau đó cập nhật _owner mới
        address previousOwner = _owner;
        _owner = newOwner;

        // 3. Phát sự kiện chuyển quyền sở hữu hợp đồng
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
        // 1. Kiểm tra 3 chuỗi đầu vào không được rỗng và không vượt quá độ dài tối đa
        _requireNonEmptyWithin(certificateId, MAX_ID_LEN);
        _requireNonEmptyWithin(fileHash, MAX_HASH_LEN);
        _requireNonEmptyWithin(ipfsCid, MAX_CID_LEN);

        // 2. Băm certificateId bằng keccak256 để làm khóa bytes32 trong mapping _certificates
        bytes32 idKey = keccak256(bytes(certificateId));
        // Nếu trường issuer khác address(0) nghĩa là mã chứng chỉ này đã từng được cấp -> báo lỗi trùng
        if (_certificates[idKey].issuer != address(0)) revert CertificateExists();

        // 3. Băm fileHash để kiểm tra file PDF này đã từng được cấp cho chứng chỉ nào chưa
        bytes32 hashKey = keccak256(bytes(fileHash));
        if (_hashToCert[hashKey] != bytes32(0)) revert HashAlreadyUsed();

        // 4. Lấy thời gian của block hiện tại (UNIX timestamp theo giây)
        uint64 issuedAt = uint64(block.timestamp);

        // 5. Ghi dữ liệu struct Certificate mới vào storage
        _certificates[idKey] = Certificate({
            certificateId: certificateId,
            fileHash: fileHash,
            ipfsCid: ipfsCid,
            issuer: msg.sender, // Ví của đơn vị đang gọi hàm
            issuedAt: issuedAt,
            isRevoked: false, // Mới cấp nên chưa bị thu hồi
            isLocked: false // Mới cấp nên chưa bị khoá
        });

        // 6. Lưu ánh xạ ngược từ hashKey -> idKey để verifyByHash tra cứu nhanh O(1)
        _hashToCert[hashKey] = idKey;
        // 7. Tăng bộ đếm tổng chứng chỉ và số chứng chỉ của issuer này
        _totalCertificates += 1;
        _issuedCount[msg.sender] += 1;

        // 8. Phát sự kiện CertificateIssued (Backend dựa vào event này để xác nhận & lưu MongoDB)
        emit CertificateIssued(idKey, certificateId, fileHash, msg.sender, issuedAt);
    }

    /// @notice Thu hồi một chứng chỉ.
    /// @dev Chỉ issuer đã cấp hoặc owner được thu hồi. Không xóa dữ liệu.
    function revokeCertificate(string calldata certificateId) external override {
        // 1. Tính khóa idKey và lấy tham chiếu storage của chứng chỉ
        bytes32 idKey = keccak256(bytes(certificateId));
        Certificate storage cert = _certificates[idKey];

        // 2. Kiểm tra chứng chỉ có tồn tại và chưa bị thu hồi trước đó không
        if (cert.issuer == address(0)) revert CertificateNotFound();
        if (cert.isRevoked) revert AlreadyRevoked();
        // 3. Chỉ đúng issuer đã cấp hoặc owner của contract mới được quyền thu hồi
        if (msg.sender != cert.issuer && msg.sender != _owner) revert NotIssuer();

        // 4. Đánh dấu thu hồi vĩnh viễn và gỡ trạng thái tạm khoá (nếu có)
        cert.isRevoked = true;
        cert.isLocked = false;

        // 5. Event ghi nhận issuer của chứng chỉ; owner thu hồi là ngoại lệ.
        emit CertificateRevoked(idKey, cert.issuer, uint64(block.timestamp));
    }

    /// @notice Tạm khoá một chứng chỉ đang hợp lệ.
    /// @dev Chỉ issuer đã cấp chứng chỉ được khoá.
    function lockCertificate(string calldata certificateId) external override {
        // 1. Tìm chứng chỉ trong storage theo keccak256(certificateId)
        bytes32 idKey = keccak256(bytes(certificateId));
        Certificate storage cert = _certificates[idKey];

        // 2. Kiểm tra tồn tại, chưa thu hồi vĩnh viễn, và chưa bị khoá
        if (cert.issuer == address(0)) revert CertificateNotFound();
        if (cert.isRevoked) revert AlreadyRevoked();
        if (cert.isLocked) revert AlreadyLocked();
        // 3. Chỉ chính issuer đã cấp chứng chỉ này mới được phép tạm khoá
        if (msg.sender != cert.issuer) revert NotIssuer();

        // 4. Bật cờ tạm khoá
        cert.isLocked = true;

        // 5. Phát sự kiện CertificateLocked
        emit CertificateLocked(idKey, cert.issuer, uint64(block.timestamp));
    }

    /// @notice Mở khoá một chứng chỉ đang bị tạm khoá.
    /// @dev Issuer đã cấp hoặc owner được mở khoá để xử lý sự cố.
    function unlockCertificate(string calldata certificateId) external override {
        // 1. Tìm chứng chỉ trong storage
        bytes32 idKey = keccak256(bytes(certificateId));
        Certificate storage cert = _certificates[idKey];

        // 2. Kiểm tra tồn tại, chưa bị thu hồi vĩnh viễn, và hiện tại phải đang bị khoá
        if (cert.issuer == address(0)) revert CertificateNotFound();
        if (cert.isRevoked) revert AlreadyRevoked();
        if (!cert.isLocked) revert NotLocked();
        // 3. Cho phép issuer đã cấp hoặc owner mở khoá
        if (msg.sender != cert.issuer && msg.sender != _owner) revert NotIssuer();

        // 4. Tắt cờ tạm khoá -> chứng chỉ trở lại hợp lệ
        cert.isLocked = false;

        // 5. Phát sự kiện CertificateUnlocked
        emit CertificateUnlocked(idKey, cert.issuer, uint64(block.timestamp));
    }

    // ---------------------------------------------------------------------
    // Truy vấn (view functions: chỉ đọc dữ liệu, gọi từ ngoài không mất gas)
    // ---------------------------------------------------------------------

    /// @inheritdoc ICertificateRegistry
    function getCertificate(string calldata certificateId)
        external
        view
        override
        returns (Certificate memory)
    {
        // Đọc bản sao struct Certificate ra `memory` để trả về cho caller
        Certificate memory cert = _certificates[keccak256(bytes(certificateId))];
        // Nếu issuer == address(0) tức là chưa từng tồn tại -> revert lỗi CertificateNotFound
        if (cert.issuer == address(0)) revert CertificateNotFound();
        return cert;
    }

    /// @inheritdoc ICertificateRegistry
    function getIssuer(address who) external view override returns (Issuer memory) {
        return _issuers[who]; // Trả về thông tin Issuer (nếu chưa thêm thì các trường có giá trị mặc định: "", false, 0)
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
        // 1. Tìm idKey tương ứng với hash của file PDF
        bytes32 idKey = _hashToCert[keccak256(bytes(fileHash))];
        // Nếu idKey == 0x00...00 nghĩa là file chưa từng được neo lên contract
        if (idKey == bytes32(0)) {
            return (false, false, "", address(0), 0);
        }

        // 2. Lấy tham chiếu storage tới chứng chỉ
        Certificate storage cert = _certificates[idKey];
        if (cert.issuer == address(0)) {
            return (false, false, "", address(0), 0);
        }

        // 3. Trả về: tồn tại = true, hợp lệ khi KHÔNG bị thu hồi VÀ KHÔNG bị khoá
        return (
            true,
            !cert.isRevoked && !cert.isLocked,
            cert.certificateId,
            cert.issuer,
            cert.issuedAt
        );
    }

    /// @inheritdoc ICertificateRegistry
    function isValid(string calldata certificateId) external view override returns (bool) {
        Certificate storage cert = _certificates[keccak256(bytes(certificateId))];
        // Hợp lệ khi: đã được cấp (issuer != 0) && chưa thu hồi && chưa tạm khoá
        return cert.issuer != address(0) && !cert.isRevoked && !cert.isLocked;
    }

    // ---------------------------------------------------------------------
    // Nội bộ (private: chỉ các hàm bên trong contract này mới gọi được)
    // ---------------------------------------------------------------------

    /// @dev Yêu cầu chuỗi không rỗng và không vượt quá độ dài cho phép.
    function _requireNonEmptyWithin(string calldata value, uint256 maxLen) private pure {
        uint256 len = bytes(value).length; // Độ dài tính theo số byte
        if (len == 0) revert EmptyField(); // Nếu rỗng -> revert EmptyField()
        if (len > maxLen) revert FieldTooLong(); // Nếu vượt quá maxLen -> revert FieldTooLong()
    }
}
