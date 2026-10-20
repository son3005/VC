import { Router } from "express";
import {
  createIssuerController,
  listIssuersController,
} from "../controllers/issuer.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", listIssuersController);
router.post("/", createIssuerController);

export { router as issuerRouter };
