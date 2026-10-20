import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  loginController,
  meController,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Quá nhiều lần đăng nhập, thử lại sau 1 phút",
    },
  },
});

router.post("/login", loginLimiter, loginController);
router.get("/me", requireAuth, meController);

export { router as authRouter };
