import { Router } from "express";
import {
  adminCertificateDetailController,
  adminCertificatesController,
  adminRevokeCertificateController,
  adminStatsController,
  syncStatusController,
  triggerSyncController,
} from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/stats", adminStatsController);

router.get("/certificates", adminCertificatesController);
router.get("/certificates/:id", adminCertificateDetailController);
router.post("/certificates/:id/revoke", adminRevokeCertificateController);

router.get("/sync/status", syncStatusController);
router.post("/sync", triggerSyncController);

export { router as adminRouter };
