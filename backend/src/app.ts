import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { ZodError } from "zod";
import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { healthRouter } from "./routes/health.routes";
import { issuerRouter } from "./routes/issuer.routes";
import { HttpError } from "./utils/http-error";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

const allowedOrigins = env.FRONTEND_ORIGIN.split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Cho phép request không có Origin (curl, server-to-server).
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, "");
      return callback(null, allowedOrigins.includes(normalized));
    },
    credentials: true,
  })
);

app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    data: {
      service: "verify-certification-api",
      version: "1.0.0",
      health: "/api/health",
    },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/issuers", issuerRouter);
app.use("/api", healthRouter);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route không tồn tại",
    },
  });
});

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu không hợp lệ",
        details: err.issues,
      },
    });
    return;
  }

  const isHttpError = err instanceof HttpError;
  const status = isHttpError ? err.status : 500;
  const code = isHttpError ? err.code : "INTERNAL_ERROR";
  const rawMessage = err instanceof Error ? err.message : "Unknown error";

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}: ${rawMessage}`);
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message:
        status >= 500 && env.NODE_ENV === "production"
          ? "Đã có lỗi xảy ra"
          : rawMessage,
      details: isHttpError ? err.details : undefined,
    },
  });
};

app.use(errorHandler);

export { app };
