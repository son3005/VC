import { Router } from "express";
import {
  createIssuerController,
  deactivateIssuerController,
  listIssuersController,
} from "../controllers/issuer.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", listIssuersController);
router.post("/", createIssuerController);
router.post("/:id/deactivate", deactivateIssuerController);

export { router as issuerRouter };
