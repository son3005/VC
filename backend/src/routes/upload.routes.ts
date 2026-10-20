import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { env } from "../config/env";
import { uploadController } from "../controllers/upload.controller";
import { requireAuth } from "../middleware/auth";
import { requireActiveIssuer } from "../middleware/issuer";
import { HttpError } from "../utils/http-error";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 1,
  },
});

const singleFile = upload.single("file");

const uploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  singleFile(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      return next(
        new HttpError(400, "UPLOAD_INVALID", "File quá lớn hoặc không hợp lệ")
      );
    }

    if (error) return next(error);
    return next();
  });
};

router.post(
  "/",
  requireAuth,
  requireActiveIssuer,
  uploadMiddleware,
  uploadController
);

export { router as uploadRouter };
