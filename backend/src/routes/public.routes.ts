import { Router } from "express";
import {
  detailPublicController,
  filtersPublicController,
  recentPublicController,
  searchPublicController,
  verifyPublicController,
} from "../controllers/public.controller";

const router = Router();

router.get("/certificates/recent", recentPublicController);
router.get("/certificates", searchPublicController);
router.get("/certificates/:id", detailPublicController);
router.get("/verify", verifyPublicController);
router.get("/filters", filtersPublicController);

export { router as publicRouter };
