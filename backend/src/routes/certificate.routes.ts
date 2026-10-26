import { Router } from "express";
import {
  createCertificateController,
  getCertificateController,
  listCertificatesController,
  lockCertificateController,
  prepareCertificateController,
  revokeCertificateController,
  unlockCertificateController,
} from "../controllers/certificate.controller";
import { requireAuth } from "../middleware/auth";
import { requireActiveIssuer } from "../middleware/issuer";

const router = Router();

router.use(requireAuth);

router.get("/", requireActiveIssuer, listCertificatesController);
router.post("/prepare", requireActiveIssuer, prepareCertificateController);
router.post("/confirm", requireActiveIssuer, createCertificateController);
router.post("/", requireActiveIssuer, createCertificateController);

// Revoke cho phép issuer sở hữu hoặc admin owner; service kiểm tra quyền.
router.get("/:id", getCertificateController);
router.post("/:id/revoke", revokeCertificateController);
router.post("/:id/lock", lockCertificateController);
router.post("/:id/unlock", unlockCertificateController);

export { router as certificateRouter };
