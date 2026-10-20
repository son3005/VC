import { Router } from "express";
import { JsonRpcProvider } from "ethers";
import { env } from "../config/env";
import { getDBStatus } from "../config/db";

const provider = new JsonRpcProvider(env.SEPOLIA_RPC_URL, env.CHAIN_ID, {
  staticNetwork: true,
});

const router = Router();

async function getBlockNumber(): Promise<number | null> {
  try {
    return await Promise.race([
      provider.getBlockNumber(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("RPC timeout")), 5_000)
      ),
    ]);
  } catch {
    return null;
  }
}

/**
 * GET /api/health
 * Dùng cho Render health check và warm-up.
 */
router.get("/health", async (_req, res) => {
  const db = getDBStatus();
  const blockNumber = await getBlockNumber();
  const healthy = db === "connected" && blockNumber !== null;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? "ok" : "degraded",
      db,
      blockNumber,
      chainId: env.CHAIN_ID,
      contract: env.CONTRACT_ADDRESS,
      deployBlock: env.DEPLOY_BLOCK,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

export { router as healthRouter };
