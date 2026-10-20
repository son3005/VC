import { app } from "./app";
import { env } from "./config/env";
import { connectDB, disconnectDB } from "./config/db";
import { syncService } from "./services/sync.service";

async function bootstrap(): Promise<void> {
  await connectDB();

  const server = app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`[server] listening on http://0.0.0.0:${env.PORT}`);
    console.log("[server] health: /api/health");

    void syncService.start().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[sync] failed to start:", message);
    });
  });

  let shuttingDown = false;

  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`[server] ${signal} received, shutting down...`);
    syncService.stop();

    server.close(() => {
      void disconnectDB().finally(() => process.exit(0));
    });

    setTimeout(() => {
      console.error("[server] forced exit after timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (reason) => {
  console.error("[process] unhandledRejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[process] uncaughtException:", error);
  process.exit(1);
});

bootstrap().catch((error) => {
  console.error("[bootstrap] failed:", error);
  process.exit(1);
});
