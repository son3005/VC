import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { keccak256, toUtf8Bytes } from "ethers";

// ============================================================================
// Dữ liệu mẫu (Mock data) dùng xuyên suốt các kịch bản kiểm thử
// ============================================================================
const ISSUER_NAME = "Khoa Công nghệ Thông tin";
const CERT_ID = "UIT-DEG-2026-0001";
const FILE_HASH = "sha256:" + "a".repeat(64);
const CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

// Hàm tiện ích: Băm chuỗi mã chứng chỉ sang bytes32 keccak256 để so sánh với event on-chain
const idHash = (id: string) => keccak256(toUtf8Bytes(id));

// ============================================================================
// Fixtures: Khởi tạo trạng thái môi trường test ban đầu (tối ưu tốc độ với snapshot)
// ============================================================================

// Fixture 1: Triển khai hợp đồng mới tinh với 3 tài khoản ví test
async function deployFixture() {
  const [owner, issuer, other] = await ethers.getSigners();
  const Registry = await ethers.getContractFactory("CertificateRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  return { registry, owner, issuer, other };
}

// Fixture 2: Triển khai hợp đồng và cấp quyền Issuer cho ví `issuer`
async function issuerFixture() {
  const base = await deployFixture();
  await base.registry.addIssuer(base.issuer.address, ISSUER_NAME);
  return base;
}

// Fixture 3: Triển khai hợp đồng, thêm Issuer và cấp sẵn 1 chứng chỉ mẫu
async function issuedFixture() {
  const base = await issuerFixture();
  await base.registry
    .connect(base.issuer)
    .issueCertificate(CERT_ID, FILE_HASH, CID);
  return base;
}

// ============================================================================
// Bộ kiểm thử tự động cho Smart Contract CertificateRegistry
// ============================================================================
describe("CertificateRegistry", () => {
  // 1. Kiểm tra trạng thái khởi tạo sau khi deploy
  describe("Deployment", () => {
    it("sets the deployer as owner", async () => {
      // Người deploy phải là Owner quản trị hợp đồng
      const { registry, owner } = await loadFixture(deployFixture);
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("starts with zero certificates", async () => {
      // Ban đầu số lượng chứng chỉ phải bằng 0
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.totalCertificates()).to.equal(0);
    });

    it("exposes a version", async () => {
      // Phiên bản hợp đồng đúng như định nghĩa (1.0.0)
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.VERSION()).to.equal("1.0.0");
    });
  });

  // 2. Kiểm tra nghiệp vụ quản lý đơn vị cấp bằng (Issuer Management)
  describe("Issuer management", () => {
    it("allows owner to add an issuer", async () => {
      // Owner có quyền thêm mới một đơn vị cấp bằng và bắn ra sự kiện IssuerUpdated
      const { registry, issuer } = await loadFixture(deployFixture);

      await expect(registry.addIssuer(issuer.address, ISSUER_NAME))
        .to.emit(registry, "IssuerUpdated")
        .withArgs(issuer.address, ISSUER_NAME, true);

      const info = await registry.getIssuer(issuer.address);
      expect(info.name).to.equal(ISSUER_NAME);
      expect(info.active).to.equal(true);
      expect(info.addedAt).to.be.greaterThan(0);
    });

    it("rejects addIssuer from non-owner", async () => {
      // Tài khoản không phải Owner sẽ bị từ chối với lỗi NotOwner
      const { registry, issuer, other } = await loadFixture(deployFixture);

      await expect(
        registry.connect(other).addIssuer(issuer.address, ISSUER_NAME)
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });

    it("rejects zero address", async () => {
      // Không cho phép thêm địa chỉ ví rỗng (0x0)
      const { registry } = await loadFixture(deployFixture);

      await expect(
        registry.addIssuer(ethers.ZeroAddress, ISSUER_NAME)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("rejects empty name", async () => {
      // Không cho phép tên đơn vị cấp bằng rỗng
      const { registry, issuer } = await loadFixture(deployFixture);

      await expect(
        registry.addIssuer(issuer.address, "")
      ).to.be.revertedWithCustomError(registry, "EmptyField");
    });

    it("rejects name longer than 100 bytes", async () => {
      // Từ chối tên đơn vị dài vượt quá giới hạn 100 ký tự
      const { registry, issuer } = await loadFixture(deployFixture);

      await expect(
        registry.addIssuer(issuer.address, "A".repeat(101))
      ).to.be.revertedWithCustomError(registry, "FieldTooLong");
    });

    it("keeps original addedAt when re-activating", async () => {
      // Khi kích hoạt lại hoặc cập nhật tên issuer, giữ nguyên mốc thời gian addedAt ban đầu
      const { registry, issuer } = await loadFixture(issuerFixture);
      const first = await registry.getIssuer(issuer.address);

      await time.increase(100);
      await registry.addIssuer(issuer.address, "Khoa CNTT (đổi tên)");

      const second = await registry.getIssuer(issuer.address);
      expect(second.addedAt).to.equal(first.addedAt);
      expect(second.name).to.equal("Khoa CNTT (đổi tên)");
      expect(second.active).to.equal(true);
    });

    it("allows owner to remove an issuer", async () => {
      // Owner có quyền hủy kích hoạt một đơn vị cấp bằng
      const { registry, issuer } = await loadFixture(issuerFixture);

      await expect(registry.removeIssuer(issuer.address))
        .to.emit(registry, "IssuerUpdated")
        .withArgs(issuer.address, ISSUER_NAME, false);

      const info = await registry.getIssuer(issuer.address);
      expect(info.active).to.equal(false);
    });

    it("rejects removing an unknown issuer", async () => {
      // Báo lỗi NotIssuer nếu cố gắng xóa một ví chưa từng được thêm
      const { registry, other } = await loadFixture(deployFixture);

      await expect(
        registry.removeIssuer(other.address)
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("rejects removing an already inactive issuer", async () => {
      // Báo lỗi nếu cố gắng xóa một đơn vị đã bị vô hiệu hóa trước đó
      const { registry, issuer } = await loadFixture(issuerFixture);
      await registry.removeIssuer(issuer.address);

      await expect(
        registry.removeIssuer(issuer.address)
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });
  });

  // 3. Kiểm tra nghiệp vụ cấp chứng chỉ (Issuing Certificates)
  describe("Issuing certificates", () => {
    it("issues a certificate and emits the event", async () => {
      // Cấp chứng chỉ thành công, bắn sự kiện CertificateIssued và tăng bộ đếm
      const { registry, issuer } = await loadFixture(issuerFixture);

      await expect(
        registry.connect(issuer).issueCertificate(CERT_ID, FILE_HASH, CID)
      )
        .to.emit(registry, "CertificateIssued")
        .withArgs(idHash(CERT_ID), CERT_ID, FILE_HASH, issuer.address, anyValue);

      expect(await registry.totalCertificates()).to.equal(1);
      expect(await registry.issuedCount(issuer.address)).to.equal(1);
    });

    it("stores certificate fields correctly", async () => {
      // Dữ liệu chứng chỉ lưu trên storage khớp chính xác với thông tin được cấp
      const { registry, issuer } = await loadFixture(issuedFixture);
      const cert = await registry.getCertificate(CERT_ID);

      expect(cert.certificateId).to.equal(CERT_ID);
      expect(cert.fileHash).to.equal(FILE_HASH);
      expect(cert.ipfsCid).to.equal(CID);
      expect(cert.issuer).to.equal(issuer.address);
      expect(cert.issuedAt).to.be.greaterThan(0);
      expect(cert.isRevoked).to.equal(false);
    });

    it("rejects issuance from a non-issuer", async () => {
      // Ví không có quyền Issuer sẽ không thể cấp chứng chỉ
      const { registry, other } = await loadFixture(deployFixture);

      await expect(
        registry.connect(other).issueCertificate(CERT_ID, FILE_HASH, CID)
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("rejects issuance from a removed issuer", async () => {
      // Đơn vị đã bị hủy quyền không thể cấp chứng chỉ mới
      const { registry, issuer } = await loadFixture(issuerFixture);
      await registry.removeIssuer(issuer.address);

      await expect(
        registry.connect(issuer).issueCertificate(CERT_ID, FILE_HASH, CID)
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("rejects an empty certificate id", async () => {
      // Không cho phép mã chứng chỉ rỗng
      const { registry, issuer } = await loadFixture(issuerFixture);

      await expect(
        registry.connect(issuer).issueCertificate("", FILE_HASH, CID)
      ).to.be.revertedWithCustomError(registry, "EmptyField");
    });

    it("rejects an empty file hash", async () => {
      // Không cho phép mã hash file rỗng
      const { registry, issuer } = await loadFixture(issuerFixture);

      await expect(
        registry.connect(issuer).issueCertificate(CERT_ID, "", CID)
      ).to.be.revertedWithCustomError(registry, "EmptyField");
    });

    it("rejects an empty CID", async () => {
      // Không cho phép CID IPFS rỗng
      const { registry, issuer } = await loadFixture(issuerFixture);

      await expect(
        registry.connect(issuer).issueCertificate(CERT_ID, FILE_HASH, "")
      ).to.be.revertedWithCustomError(registry, "EmptyField");
    });

    it("rejects a certificate id longer than 64 bytes", async () => {
      // Từ chối mã chứng chỉ vượt quá 64 ký tự
      const { registry, issuer } = await loadFixture(issuerFixture);

      await expect(
        registry.connect(issuer).issueCertificate("A".repeat(65), FILE_HASH, CID)
      ).to.be.revertedWithCustomError(registry, "FieldTooLong");
    });

    it("rejects a duplicate certificate id", async () => {
      // Chống trùng lặp mã chứng chỉ: không cho phép cấp 2 lần cùng một ID
      const { registry, issuer } = await loadFixture(issuedFixture);

      await expect(
        registry.connect(issuer).issueCertificate(CERT_ID, "sha256:" + "b".repeat(64), CID)
      ).to.be.revertedWithCustomError(registry, "CertificateExists");
    });

    it("rejects a duplicate file hash", async () => {
      // Chống trùng lặp file: không cho phép cấp 2 chứng chỉ có cùng mã hash PDF
      const { registry, issuer } = await loadFixture(issuedFixture);

      await expect(
        registry
          .connect(issuer)
          .issueCertificate("UIT-DEG-2026-0002", FILE_HASH, CID)
      ).to.be.revertedWithCustomError(registry, "HashAlreadyUsed");
    });

    it("allows the same issuer to issue multiple certificates", async () => {
      // Cho phép một đơn vị cấp nhiều chứng chỉ khác nhau và tăng đúng biến đếm
      const { registry, issuer } = await loadFixture(issuedFixture);

      await registry
        .connect(issuer)
        .issueCertificate(
          "UIT-DEG-2026-0002",
          "sha256:" + "b".repeat(64),
          "bafybeihash2"
        );

      expect(await registry.totalCertificates()).to.equal(2);
      expect(await registry.issuedCount(issuer.address)).to.equal(2);
    });
  });

  // 4. Kiểm tra các hàm truy vấn và đối soát (Queries & Verification)
  describe("Queries", () => {
    it("reverts when certificate does not exist", async () => {
      // Báo lỗi CertificateNotFound khi truy vấn mã chứng chỉ không tồn tại
      const { registry } = await loadFixture(deployFixture);

      await expect(
        registry.getCertificate("UNKNOWN")
      ).to.be.revertedWithCustomError(registry, "CertificateNotFound");
    });

    it("returns full certificate data", async () => {
      // Trả về đầy đủ thông tin chi tiết của chứng chỉ
      const { registry } = await loadFixture(issuedFixture);
      const cert = await registry.getCertificate(CERT_ID);
      expect(cert.certificateId).to.equal(CERT_ID);
    });

    it("verifies by hash and reports validity", async () => {
      // Tra cứu và xác minh bằng mã băm file SHA-256 (hợp lệ, trả về ID và ví người cấp)
      const { registry, issuer } = await loadFixture(issuedFixture);
      const result = await registry.verifyByHash(FILE_HASH);

      expect(result.exists).to.equal(true);
      expect(result.valid).to.equal(true);
      expect(result.certificateId).to.equal(CERT_ID);
      expect(result.issuer).to.equal(issuer.address);
    });

    it("returns exists=false for an unknown hash", async () => {
      // Trả về exists=false khi file hash không khớp với bất kỳ chứng chỉ nào trên chain
      const { registry } = await loadFixture(deployFixture);
      const result = await registry.verifyByHash("sha256:" + "f".repeat(64));

      expect(result.exists).to.equal(false);
      expect(result.valid).to.equal(false);
      expect(result.issuer).to.equal(ethers.ZeroAddress);
    });

    it("isValid returns true for active and false for unknown", async () => {
      // Kiểm tra tính hợp lệ nhanh: true nếu đang hoạt động, false nếu không tồn tại
      const { registry } = await loadFixture(issuedFixture);

      expect(await registry.isValid(CERT_ID)).to.equal(true);
      expect(await registry.isValid("UNKNOWN")).to.equal(false);
    });

    it("returns an empty issuer for an unknown address", async () => {
      // Truy vấn thông tin của ví chưa được cấp quyền trả về struct rỗng
      const { registry, other } = await loadFixture(deployFixture);
      const info = await registry.getIssuer(other.address);

      expect(info.name).to.equal("");
      expect(info.active).to.equal(false);
      expect(info.addedAt).to.equal(0);
    });
  });

  // 5. Kiểm tra nghiệp vụ tạm khóa và mở khóa chứng chỉ (Temporary Locking)
  describe("Temporary locking", () => {
    it("allows the issuing issuer to lock and unlock", async () => {
      // Đơn vị đã phát hành có quyền tạm khóa và mở khóa lại chứng chỉ
      const { registry, issuer } = await loadFixture(issuedFixture);

      // Tạm khóa: trạng thái chuyển sang isLocked=true và isValid=false
      await expect(registry.connect(issuer).lockCertificate(CERT_ID))
        .to.emit(registry, "CertificateLocked")
        .withArgs(idHash(CERT_ID), issuer.address, anyValue);

      let cert = await registry.getCertificate(CERT_ID);
      expect(cert.isLocked).to.equal(true);
      expect(await registry.isValid(CERT_ID)).to.equal(false);

      // Mở khóa: trạng thái chuyển về isLocked=false và isValid=true
      await expect(registry.connect(issuer).unlockCertificate(CERT_ID))
        .to.emit(registry, "CertificateUnlocked")
        .withArgs(idHash(CERT_ID), issuer.address, anyValue);

      cert = await registry.getCertificate(CERT_ID);
      expect(cert.isLocked).to.equal(false);
      expect(await registry.isValid(CERT_ID)).to.equal(true);
    });

    it("rejects locking by a non-issuer", async () => {
      // Tài khoản ngoài không thể tự ý khóa chứng chỉ
      const { registry, other } = await loadFixture(issuedFixture);

      await expect(
        registry.connect(other).lockCertificate(CERT_ID)
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("rejects double locking", async () => {
      // Không cho phép tạm khóa 2 lần liên tiếp trên chứng chỉ đã bị khóa
      const { registry, issuer } = await loadFixture(issuedFixture);
      await registry.connect(issuer).lockCertificate(CERT_ID);

      await expect(
        registry.connect(issuer).lockCertificate(CERT_ID)
      ).to.be.revertedWithCustomError(registry, "AlreadyLocked");
    });

    it("allows owner to unlock and rejects unlocking an active certificate", async () => {
      // Owner có quyền mở khóa xử lý sự cố; từ chối mở khóa chứng chỉ đang bình thường
      const { registry, owner, issuer } = await loadFixture(issuedFixture);
      await registry.connect(issuer).lockCertificate(CERT_ID);

      await registry.connect(owner).unlockCertificate(CERT_ID);
      await expect(
        registry.connect(issuer).unlockCertificate(CERT_ID)
      ).to.be.revertedWithCustomError(registry, "NotLocked");
    });

    it("rejects locking a revoked certificate", async () => {
      // Không cho phép khóa chứng chỉ đã bị thu hồi vĩnh viễn
      const { registry, issuer } = await loadFixture(issuedFixture);
      await registry.connect(issuer).revokeCertificate(CERT_ID);

      await expect(
        registry.connect(issuer).lockCertificate(CERT_ID)
      ).to.be.revertedWithCustomError(registry, "AlreadyRevoked");
    });
  });

  // 6. Kiểm tra nghiệp vụ thu hồi chứng chỉ (Revocation)
  describe("Revocation", () => {
    it("allows the issuing issuer to revoke", async () => {
      // Đơn vị đã cấp có quyền thu hồi chứng chỉ do mình phát hành
      const { registry, issuer } = await loadFixture(issuedFixture);

      await expect(registry.connect(issuer).revokeCertificate(CERT_ID))
        .to.emit(registry, "CertificateRevoked")
        .withArgs(idHash(CERT_ID), issuer.address, anyValue);

      const cert = await registry.getCertificate(CERT_ID);
      expect(cert.isRevoked).to.equal(true);
      expect(await registry.isValid(CERT_ID)).to.equal(false);
    });

    it("allows the owner to revoke", async () => {
      // Owner quản trị trường có quyền thu hồi bất kỳ chứng chỉ nào
      const { registry, owner } = await loadFixture(issuedFixture);

      await expect(registry.connect(owner).revokeCertificate(CERT_ID)).to.emit(
        registry,
        "CertificateRevoked"
      );

      expect(await registry.isValid(CERT_ID)).to.equal(false);
    });

    it("rejects revocation from a stranger", async () => {
      // Ví người lạ không thể thu hồi chứng chỉ
      const { registry, other } = await loadFixture(issuedFixture);

      await expect(
        registry.connect(other).revokeCertificate(CERT_ID)
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("rejects double revocation", async () => {
      // Không thể thu hồi lại chứng chỉ đã bị thu hồi trước đó
      const { registry, issuer } = await loadFixture(issuedFixture);
      await registry.connect(issuer).revokeCertificate(CERT_ID);

      await expect(
        registry.connect(issuer).revokeCertificate(CERT_ID)
      ).to.be.revertedWithCustomError(registry, "AlreadyRevoked");
    });

    it("rejects revoking an unknown certificate", async () => {
      // Báo lỗi CertificateNotFound nếu thu hồi chứng chỉ không tồn tại
      const { registry, issuer } = await loadFixture(issuerFixture);

      await expect(
        registry.connect(issuer).revokeCertificate("UNKNOWN")
      ).to.be.revertedWithCustomError(registry, "CertificateNotFound");
    });

    it("keeps old certificates valid after issuer removal", async () => {
      // Tính toàn vẹn: khi đơn vị cấp bị gỡ quyền, các chứng chỉ họ từng cấp vẫn giữ nguyên giá trị
      const { registry, issuer } = await loadFixture(issuedFixture);
      await registry.removeIssuer(issuer.address);

      expect(await registry.isValid(CERT_ID)).to.equal(true);
      const result = await registry.verifyByHash(FILE_HASH);
      expect(result.exists).to.equal(true);
      expect(result.valid).to.equal(true);
    });
  });

  // 7. Kiểm tra chuyển nhượng quyền quản trị hệ thống (Ownership Management)
  describe("Ownership", () => {
    it("transfers ownership", async () => {
      // Owner có thể chuyển giao quyền quản trị sang ví mới thành công
      const { registry, owner, other } = await loadFixture(deployFixture);

      await expect(registry.transferOwnership(other.address))
        .to.emit(registry, "OwnershipTransferred")
        .withArgs(owner.address, other.address);

      expect(await registry.owner()).to.equal(other.address);
    });

    it("rejects zero address as new owner", async () => {
      // Từ chối chuyển quyền sang ví rỗng 0x0
      const { registry } = await loadFixture(deployFixture);

      await expect(
        registry.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("rejects transferring to the current owner", async () => {
      // Từ chối chuyển quyền cho chính bản thân owner hiện tại
      const { registry, owner } = await loadFixture(deployFixture);

      await expect(
        registry.transferOwnership(owner.address)
      ).to.be.revertedWithCustomError(registry, "InvalidOwnershipTransfer");
    });

    it("removes owner rights from the previous owner", async () => {
      // Sau khi chuyển nhượng, Owner cũ mất hoàn toàn quyền hạn quản trị
      const { registry, owner, issuer, other } = await loadFixture(deployFixture);
      await registry.transferOwnership(other.address);

      await expect(
        registry.connect(owner).addIssuer(issuer.address, ISSUER_NAME)
      ).to.be.revertedWithCustomError(registry, "NotOwner");

      await registry.connect(other).addIssuer(issuer.address, ISSUER_NAME);
      const info = await registry.getIssuer(issuer.address);
      expect(info.active).to.equal(true);
    });
  });
});
