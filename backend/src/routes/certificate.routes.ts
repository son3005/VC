import { Router } from "express";
import {
  createCertificateController,
  listCertificatesController,
} from "../controllers/certificate.controller";
import { requireAuth } from "../middleware/auth";
import { requireActiveIssuer } from "../middleware/issuer";

const router = Router();

router.use(requireAuth);

router.get("/", requireActiveIssuer, listCertificatesController);
router.post("/", requireActiveIssuer, createCertificateController);

export { router as certificateRouter };
