import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { healthRouter } from "./routes/health.routes";

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
  const message = err instanceof Error ? err.message : "Unknown error";
  console.error(`[error] ${req.method} ${req.originalUrl}: ${message}`);

  const status =
    typeof (err as { status?: unknown }).status === "number"
      ? (err as { status: number }).status
      : 500;

  res.status(status).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        env.NODE_ENV === "production" ? "Đã có lỗi xảy ra" : message,
    },
  });
};

app.use(errorHandler);

export { app };
