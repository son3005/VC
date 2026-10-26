import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { keccak256, toUtf8Bytes } from "ethers";

const ISSUER_NAME = "Khoa Công nghệ Thông tin";
const CERT_ID = "UIT-DEG-2026-0001";
const FILE_HASH = "sha256:" + "a".repeat(64);
const CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

const idHash = (id: string) => keccak256(toUtf8Bytes(id));

async function deployFixture() {
  const [owner, issuer, other] = await ethers.getSigners();
  const Registry = await ethers.getContractFactory("CertificateRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  return { registry, owner, issuer, other };
}

async function issuerFixture() {
  const base = await deployFixture();
  await base.registry.addIssuer(base.issuer.address, ISSUER_NAME);
  return base;
}

async function issuedFixture() {
  const base = await issuerFixture();
  await base.registry
    .connect(base.issuer)
    .issueCertificate(CERT_ID, FILE_HASH, CID);
  return base;
}

describe("CertificateRegistry", () => {
  describe("Deployment", () => {
    it("sets the deployer as owner", async () => {
      const { registry, owner } = await loadFixture(deployFixture);
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("starts with zero certificates", async () => {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.totalCertificates()).to.equal(0);
    });

    it("exposes a version", async () => {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.VERSION()).to.equal("1.0.0");
    });
  });

  describe("Issuer management", () => {
    it("allows owner to add an issuer", async () => {
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
      const { registry, issuer, other } = await loadFixture(deployFixture);

      await expect(
        registry.connect(other).addIssuer(issuer.address, ISSUER_NAME)
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });

    it("rejects zero address", async () => {
      const { registry } = await loadFixture(deployFixture);

      await expect(
        registry.addIssuer(ethers.ZeroAddress, ISSUER_NAME)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("rejects empty name", async () => {
      const { registry, issuer } = await loadFixture(deployFixture);

      await expect(
        registry.addIssuer(issuer.address, "")
      ).to.be.revertedWithCustomError(registry, "EmptyField");
    });

    it("rejects name longer than 100 bytes", async () => {
      const { registry, issuer } = await loadFixture(deployFixture);

      await expect(
        registry.addIssuer(issuer.address, "A".repeat(101))
      ).to.be.revertedWithCustomError(registry, "FieldTooLong");
    });

    it("keeps original addedAt when re-activating", async () => {
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
      const { registry, issuer } = await loadFixture(issuerFixture);

      await expect(registry.removeIssuer(issuer.address))
        .to.emit(registry, "IssuerUpdated")
        .withArgs(issuer.address, ISSUER_NAME, false);

      const info = await registry.getIssuer(issuer.address);
      expect(info.active).to.equal(false);
    });

    it("rejects removing an unknown issuer", async () => {
      const { registry, other } = await loadFixture(deployFixture);

      await expect(
        registry.removeIssuer(other.address)
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("rejects removing an already inactive issuer", async () => {
      const { registry, issuer } = await loadFixture(issuerFixture);
      await registry.removeIssuer(issuer.address);

      await expect(
        registry.removeIssuer(issuer.address)
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });
  });

  describe("Issuing certificates", () => {
    it("issues a certificate and emits the event", async () => {
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
      const { registry, other } = await loadFixture(deployFixture);

      await expect(
        registry.connect(other).issueCertificate(CERT_ID, FILE_HASH, CID)
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("rejects issuance from a removed issuer", async () => {
      const { registry, issuer } = await loadFixture(issuerFixture);
      await registry.removeIssuer(issuer.address);

      await expect(
        registry.connect(issuer).issueCertificate(CERT_ID, FILE_HASH, CID)
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("rejects an empty certificate id", async () => {
      const { registry, issuer } = await loadFixture(issuerFixture);

      await expect(
        registry.connect(issuer).issueCertificate("", FILE_HASH, CID)
      ).to.be.revertedWithCustomError(registry, "EmptyField");
    });

    it("rejects an empty file hash", async () => {
      const { registry, issuer } = await loadFixture(issuerFixture);

      await expect(
        registry.connect(issuer).issueCertificate(CERT_ID, "", CID)
      ).to.be.revertedWithCustomError(registry, "EmptyField");
    });

    it("rejects an empty CID", async () => {
      const { registry, issuer } = await loadFixture(issuerFixture);

      await expect(
        registry.connect(issuer).issueCertificate(CERT_ID, FILE_HASH, "")
      ).to.be.revertedWithCustomError(registry, "EmptyField");
    });

    it("rejects a certificate id longer than 64 bytes", async () => {
      const { registry, issuer } = await loadFixture(issuerFixture);

      await expect(
        registry.connect(issuer).issueCertificate("A".repeat(65), FILE_HASH, CID)
      ).to.be.revertedWithCustomError(registry, "FieldTooLong");
    });

    it("rejects a duplicate certificate id", async () => {
      const { registry, issuer } = await loadFixture(issuedFixture);

      await expect(
        registry.connect(issuer).issueCertificate(CERT_ID, "sha256:" + "b".repeat(64), CID)
      ).to.be.revertedWithCustomError(registry, "CertificateExists");
    });

    it("rejects a duplicate file hash", async () => {
      const { registry, issuer } = await loadFixture(issuedFixture);

      await expect(
        registry
          .connect(issuer)
          .issueCertificate("UIT-DEG-2026-0002", FILE_HASH, CID)
      ).to.be.revertedWithCustomError(registry, "HashAlreadyUsed");
    });

    it("allows the same issuer to issue multiple certificates", async () => {
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

  describe("Queries", () => {
    it("reverts when certificate does not exist", async () => {
      const { registry } = await loadFixture(deployFixture);

      await expect(
        registry.getCertificate("UNKNOWN")
      ).to.be.revertedWithCustomError(registry, "CertificateNotFound");
    });

    it("returns full certificate data", async () => {
      const { registry } = await loadFixture(issuedFixture);
      const cert = await registry.getCertificate(CERT_ID);
      expect(cert.certificateId).to.equal(CERT_ID);
    });

    it("verifies by hash and reports validity", async () => {
      const { registry, issuer } = await loadFixture(issuedFixture);
      const result = await registry.verifyByHash(FILE_HASH);

      expect(result.exists).to.equal(true);
      expect(result.valid).to.equal(true);
      expect(result.certificateId).to.equal(CERT_ID);
      expect(result.issuer).to.equal(issuer.address);
    });

    it("returns exists=false for an unknown hash", async () => {
      const { registry } = await loadFixture(deployFixture);
      const result = await registry.verifyByHash("sha256:" + "f".repeat(64));

      expect(result.exists).to.equal(false);
      expect(result.valid).to.equal(false);
      expect(result.issuer).to.equal(ethers.ZeroAddress);
    });

    it("isValid returns true for active and false for unknown", async () => {
      const { registry } = await loadFixture(issuedFixture);

      expect(await registry.isValid(CERT_ID)).to.equal(true);
      expect(await registry.isValid("UNKNOWN")).to.equal(false);
    });

    it("returns an empty issuer for an unknown address", async () => {
      const { registry, other } = await loadFixture(deployFixture);
      const info = await registry.getIssuer(other.address);

      expect(info.name).to.equal("");
      expect(info.active).to.equal(false);
      expect(info.addedAt).to.equal(0);
    });
  });

  describe("Temporary locking", () => {
    it("allows the issuing issuer to lock and unlock", async () => {
      const { registry, issuer } = await loadFixture(issuedFixture);

      await expect(registry.connect(issuer).lockCertificate(CERT_ID))
        .to.emit(registry, "CertificateLocked")
        .withArgs(idHash(CERT_ID), issuer.address, anyValue);

      let cert = await registry.getCertificate(CERT_ID);
      expect(cert.isLocked).to.equal(true);
      expect(await registry.isValid(CERT_ID)).to.equal(false);

      await expect(registry.connect(issuer).unlockCertificate(CERT_ID))
        .to.emit(registry, "CertificateUnlocked")
        .withArgs(idHash(CERT_ID), issuer.address, anyValue);

      cert = await registry.getCertificate(CERT_ID);
      expect(cert.isLocked).to.equal(false);
      expect(await registry.isValid(CERT_ID)).to.equal(true);
    });

    it("rejects locking by a non-issuer", async () => {
      const { registry, other } = await loadFixture(issuedFixture);

      await expect(
        registry.connect(other).lockCertificate(CERT_ID)
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("rejects double locking", async () => {
      const { registry, issuer } = await loadFixture(issuedFixture);
      await registry.connect(issuer).lockCertificate(CERT_ID);

      await expect(
        registry.connect(issuer).lockCertificate(CERT_ID)
      ).to.be.revertedWithCustomError(registry, "AlreadyLocked");
    });

    it("allows owner to unlock and rejects unlocking an active certificate", async () => {
      const { registry, owner, issuer } = await loadFixture(issuedFixture);
      await registry.connect(issuer).lockCertificate(CERT_ID);

      await registry.connect(owner).unlockCertificate(CERT_ID);
      await expect(
        registry.connect(issuer).unlockCertificate(CERT_ID)
      ).to.be.revertedWithCustomError(registry, "NotLocked");
    });

    it("rejects locking a revoked certificate", async () => {
      const { registry, issuer } = await loadFixture(issuedFixture);
      await registry.connect(issuer).revokeCertificate(CERT_ID);

      await expect(
        registry.connect(issuer).lockCertificate(CERT_ID)
      ).to.be.revertedWithCustomError(registry, "AlreadyRevoked");
    });
  });

  describe("Revocation", () => {
    it("allows the issuing issuer to revoke", async () => {
      const { registry, issuer } = await loadFixture(issuedFixture);

      await expect(registry.connect(issuer).revokeCertificate(CERT_ID))
        .to.emit(registry, "CertificateRevoked")
        .withArgs(idHash(CERT_ID), issuer.address, anyValue);

      const cert = await registry.getCertificate(CERT_ID);
      expect(cert.isRevoked).to.equal(true);
      expect(await registry.isValid(CERT_ID)).to.equal(false);
    });

    it("allows the owner to revoke", async () => {
      const { registry, owner } = await loadFixture(issuedFixture);

      await expect(registry.connect(owner).revokeCertificate(CERT_ID)).to.emit(
        registry,
        "CertificateRevoked"
      );

      expect(await registry.isValid(CERT_ID)).to.equal(false);
    });

    it("rejects revocation from a stranger", async () => {
      const { registry, other } = await loadFixture(issuedFixture);

      await expect(
        registry.connect(other).revokeCertificate(CERT_ID)
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("rejects double revocation", async () => {
      const { registry, issuer } = await loadFixture(issuedFixture);
      await registry.connect(issuer).revokeCertificate(CERT_ID);

      await expect(
        registry.connect(issuer).revokeCertificate(CERT_ID)
      ).to.be.revertedWithCustomError(registry, "AlreadyRevoked");
    });

    it("rejects revoking an unknown certificate", async () => {
      const { registry, issuer } = await loadFixture(issuerFixture);

      await expect(
        registry.connect(issuer).revokeCertificate("UNKNOWN")
      ).to.be.revertedWithCustomError(registry, "CertificateNotFound");
    });

    it("keeps old certificates valid after issuer removal", async () => {
      const { registry, issuer } = await loadFixture(issuedFixture);
      await registry.removeIssuer(issuer.address);

      expect(await registry.isValid(CERT_ID)).to.equal(true);
      const result = await registry.verifyByHash(FILE_HASH);
      expect(result.exists).to.equal(true);
      expect(result.valid).to.equal(true);
    });
  });

  describe("Ownership", () => {
    it("transfers ownership", async () => {
      const { registry, owner, other } = await loadFixture(deployFixture);

      await expect(registry.transferOwnership(other.address))
        .to.emit(registry, "OwnershipTransferred")
        .withArgs(owner.address, other.address);

      expect(await registry.owner()).to.equal(other.address);
    });

    it("rejects zero address as new owner", async () => {
      const { registry } = await loadFixture(deployFixture);

      await expect(
        registry.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("rejects transferring to the current owner", async () => {
      const { registry, owner } = await loadFixture(deployFixture);

      await expect(
        registry.transferOwnership(owner.address)
      ).to.be.revertedWithCustomError(registry, "InvalidOwnershipTransfer");
    });

    it("removes owner rights from the previous owner", async () => {
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
