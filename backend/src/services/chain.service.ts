import { Contract, JsonRpcProvider } from "ethers";
import abi from "../abi/CertificateRegistry.json";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

export const provider = new JsonRpcProvider(env.SEPOLIA_RPC_URL, env.CHAIN_ID, {
  staticNetwork: true,
});

export const registry = new Contract(env.CONTRACT_ADDRESS, abi, provider);

export interface IssuerUpdatedEvent {
  blockNumber: number;
  logIndex: number;
  name: string;
  active: boolean;
}

/**
 * Tìm event IssuerUpdated trong receipt và kiểm tra khớp ví + tên.
 * Không yêu cầu tx.to == contract vì có thể đi qua proxy/forwarder.
 */
export async function findIssuerUpdatedEvent(
  txHash: string,
  wallet: string,
  expectedName: string
): Promise<IssuerUpdatedEvent> {
  let receipt;

  try {
    receipt = await provider.getTransactionReceipt(txHash);
  } catch {
    throw new HttpError(502, "CHAIN_ERROR", "Không đọc được giao dịch từ blockchain");
  }

  if (!receipt || receipt.status !== 1) {
    throw new HttpError(
      422,
      "TX_INVALID",
      "Giao dịch không tồn tại hoặc đã thất bại"
    );
  }

  const event = registry.interface.getEvent("IssuerUpdated");
  if (!event) {
    throw new HttpError(500, "INTERNAL_ERROR", "ABI thiếu event IssuerUpdated");
  }

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== env.CONTRACT_ADDRESS.toLowerCase()) {
      continue;
    }

    if (log.topics[0] !== event.topicHash) {
      continue;
    }

    const parsed = registry.interface.parseLog(log);
    if (!parsed) continue;

    const issuer = String(parsed.args.issuer).toLowerCase();
    const name = String(parsed.args.name);
    const active = Boolean(parsed.args.active);

    if (issuer === wallet.toLowerCase() && active && name === expectedName) {
      return {
        blockNumber: receipt.blockNumber,
        logIndex: log.index,
        name,
        active,
      };
    }
  }

  throw new HttpError(
    422,
    "TX_INVALID",
    "Không tìm thấy sự kiện IssuerUpdated khớp với ví và tên"
  );
}

export async function getIssuerOnChain(wallet: string): Promise<{
  name: string;
  active: boolean;
  addedAt: number;
}> {
  try {
    const result = await registry.getIssuer(wallet);

    return {
      name: String(result.name),
      active: Boolean(result.active),
      addedAt: Number(result.addedAt),
    };
  } catch {
    throw new HttpError(502, "CHAIN_ERROR", "Không đọc được issuer từ blockchain");
  }
}
