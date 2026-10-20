import { Router } from "express";
import {
  syncStatusController,
  triggerSyncController,
} from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/sync/status", syncStatusController);
router.post("/sync", triggerSyncController);

export { router as adminRouter };
