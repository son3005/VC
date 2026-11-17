import { Router } from "express";
import {
  activateIssuerController,
  createIssuerController,
  deactivateIssuerController,
  deleteIssuerController,
  listIssuersController,
} from "../controllers/issuer.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", listIssuersController);
router.post("/", createIssuerController);
router.post("/:id/deactivate", deactivateIssuerController);
router.post("/:id/activate", activateIssuerController);
router.delete("/:id", deleteIssuerController);

export { router as issuerRouter };
