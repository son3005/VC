/**
 * @file sync.service.ts
 * @description Dịch vụ đồng bộ sự kiện Blockchain (Event Indexer) về cơ sở dữ liệu MongoDB.
 * Lắng nghe và quét các sự kiện từ Smart Contract CertificateRegistry theo thời gian thực và quét bù (backfill).
 */

import { keccak256, toUtf8Bytes, type Log } from "ethers";
import { env } from "../config/env";
import { Certificate, ChainEvent, Issuer, SyncState } from "../models";
import { provider, registry } from "./chain.service";

/** Khóa định danh trạng thái đồng bộ trong bảng SyncState */
const SYNC_KEY = "certificate_registry";
/** Số lượng khối tối đa cho mỗi truy vấn getLogs nhằm tránh vượt hạn mức RPC */
const CHUNK_SIZE = 5_000;

/** Cờ đánh dấu đã kiểm tra và chuẩn hóa hash mã văn bằng */
let hashesEnsured = false;

/**
 * Đảm bảo mọi văn bằng trong cơ sở dữ liệu đều có sẵn trường certificateIdHash (keccak256)
 * Giúp tối ưu hóa tốc độ tìm kiếm khi khớp sự kiện từ Smart Contract
 */
async function ensureCertificateIdHashes(): Promise<void> {
  if (hashesEnsured) return;

  const docs = await Certificate.find({
    $or: [
      { certificateIdHash: { $exists: false } },
      { certificateIdHash: null },
    ],
  }).select("_id certificateId");

  for (const doc of docs) {
    await Certificate.updateOne(
      { _id: doc._id },
      { $set: { certificateIdHash: keccak256(toUtf8Bytes(doc.certificateId)) } }
    );
  }

  hashesEnsured = true;
}

/** Cấu trúc sự kiện sau khi bóc tách từ ABI của Smart Contract */
interface ParsedEvent {
  name: string;
  args: Record<string, unknown>;
}

/** Kết quả thống kê sau quá trình quét bù sự kiện (backfill) */
export interface BackfillResult {
  fromBlock: number;
  toBlock: number;
  processed: number;
  issued: number;
  revoked: number;
  locked: number;
  unlocked: number;
  issuers: number;
  skipped: number;
}

/**
 * Phân tích log sự kiện từ chuỗi khối dựa trên ABI của hợp đồng
 * Chuyển đổi an toàn các giá trị bigint sang chuỗi (string)
 */
function parseLog(log: Log): ParsedEvent | null {
  if (log.address.toLowerCase() !== env.CONTRACT_ADDRESS.toLowerCase()) {
    return null;
  }

  try {
    const parsed = registry.interface.parseLog(log);
    if (!parsed) return null;

    const args: Record<string, unknown> = {};
    parsed.fragment.inputs.forEach((input, index) => {
      const value = parsed.args[index];
      args[input.name] = typeof value === "bigint" ? value.toString() : value;
    });

    return { name: parsed.name, args };
  } catch {
    return null;
  }
}

/**
 * Cập nhật trạng thái nghiệp vụ trong MongoDB tương ứng với sự kiện trên Smart Contract
 * - CertificateIssued: Bổ sung hash, txHash, blockNumber vào văn bằng
 * - CertificateRevoked: Đổi trạng thái sang "revoked", gỡ bỏ cờ khóa
 * - CertificateLocked / Unlocked: Cập nhật trạng thái "locked" hoặc "active"
 * - IssuerUpdated: Cập nhật quyền phát hành và tên của đơn vị phát hành
 */
async function applyEvent(event: ParsedEvent, log: Log): Promise<void> {
  // 1. Xử lý sự kiện phát hành văn bằng
  if (event.name === "CertificateIssued") {
    const certificateId = String(event.args.certificateId);
    const cert = await Certificate.findOne({ certificateId });

    if (!cert) {
      console.warn(
        `[sync] issued event without metadata: ${certificateId} (${log.transactionHash})`
      );
      return;
    }

    const updates: Record<string, unknown> = {};
    if (!cert.certificateIdHash) updates.certificateIdHash = event.args.idHash;
    if (!cert.txHash) updates.txHash = log.transactionHash;
    if (!cert.blockNumber) updates.blockNumber = log.blockNumber;
    if (!cert.logIndex) updates.logIndex = log.index;

    if (Object.keys(updates).length > 0) {
      await Certificate.updateOne({ _id: cert._id }, { $set: updates });
    }
    return;
  }

  // 2. Xử lý sự kiện thu hồi văn bằng
  if (event.name === "CertificateRevoked") {
    const idHash = String(event.args.idHash);
    const cert = await Certificate.findOne({ certificateIdHash: idHash });

    if (!cert) {
      console.warn(
        `[sync] revoked event without metadata: ${idHash} (${log.transactionHash})`
      );
      return;
    }

    if (cert.status !== "revoked") {
      await Certificate.updateOne(
        { _id: cert._id },
        {
          $set: {
            status: "revoked",
            revokedAt: new Date(Number(event.args.revokedAt) * 1000),
            revokeTxHash: log.transactionHash.toLowerCase(),
            revokeBlockNumber: log.blockNumber,
            lockedAt: null,
            lockTxHash: null,
            lockBlockNumber: null,
          },
        }
      );
    }
    return;
  }

  // 3. Xử lý sự kiện tạm khóa hoặc mở khóa văn bằng
  if (event.name === "CertificateLocked" || event.name === "CertificateUnlocked") {
    const idHash = String(event.args.idHash);
    const cert = await Certificate.findOne({ certificateIdHash: idHash });

    if (!cert) {
      console.warn(
        `[sync] ${event.name} event without metadata: ${idHash} (${log.transactionHash})`
      );
      return;
    }

    // Văn bằng đã bị thu hồi thì không thể thay đổi trạng thái khóa
    if (cert.status === "revoked") return;

    if (event.name === "CertificateLocked") {
      await Certificate.updateOne(
        { _id: cert._id },
        {
          $set: {
            status: "locked",
            lockedAt: new Date(Number(event.args.lockedAt) * 1000),
            lockTxHash: log.transactionHash.toLowerCase(),
            lockBlockNumber: log.blockNumber,
          },
        }
      );
    } else {
      await Certificate.updateOne(
        { _id: cert._id },
        {
          $set: { status: "active" },
          $unset: { lockedAt: 1, lockTxHash: 1, lockBlockNumber: 1 },
        }
      );
    }
    return;
  }

  // 4. Xử lý sự kiện cập nhật đơn vị phát hành (Issuer)
  if (event.name === "IssuerUpdated") {
    const wallet = String(event.args.issuer).toLowerCase();
    const active = Boolean(event.args.active);
    const name = String(event.args.name);

    const updates: Record<string, unknown> = {
      onChainActive: active,
      isActive: active,
    };
    if (name) updates.name = name;
    if (active) updates.chainAddedAt = new Date();

    await Issuer.updateOne({ walletAddress: wallet }, { $set: updates });
  }
}

/**
 * Lấy hoặc khởi tạo điểm kiểm soát đồng bộ (checkpoint) từ MongoDB
 */
async function getSyncState() {
  let state = await SyncState.findOne({ key: SYNC_KEY });

  if (!state) {
    state = await SyncState.create({
      key: SYNC_KEY,
      chainId: env.CHAIN_ID,
      contractAddress: env.CONTRACT_ADDRESS.toLowerCase(),
      lastSyncedBlock: env.DEPLOY_BLOCK,
    });
  }

  return state;
}

/**
 * Xử lý sự kiện đơn lẻ kèm cơ chế chống trùng lặp (Idempotency)
 * Lưu bản ghi sự kiện bất biến vào bộ sưu tập ChainEvent
 */
async function processEvent(event: ParsedEvent, log: Log): Promise<boolean> {
  // Kiểm tra trùng lặp dựa trên cặp định danh duy nhất (txHash, logIndex)
  const existing = await ChainEvent.exists({
    txHash: log.transactionHash.toLowerCase(),
    logIndex: log.index,
  });

  if (existing) return false;

  await applyEvent(event, log);

  try {
    await ChainEvent.create({
      txHash: log.transactionHash,
      logIndex: log.index,
      blockNumber: log.blockNumber,
      eventType: event.name,
      payload: event.args,
      contractAddress: env.CONTRACT_ADDRESS.toLowerCase(),
      processedAt: new Date(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Bỏ qua lỗi duplicate key nếu có xung đột ghi đồng thời
    if (!message.includes("duplicate key")) {
      throw error;
    }
  }

  return true;
}

/**
 * Quét bù các sự kiện từ dải khối chỉ định hoặc từ mốc đồng bộ trước đó đến khối hiện tại
 * Chia nhỏ khối theo từng CHUNK_SIZE để tránh quá tải mạng RPC
 * 
 * @param {number} [fromBlock] Khối bắt đầu (mặc định: lastSyncedBlock + 1)
 * @param {number} [toBlock] Khối kết thúc (mặc định: khối hiện tại trên mạng)
 * @returns {Promise<BackfillResult>} Thống kê số lượng sự kiện đã xử lý
 */
export async function backfillEvents(
  fromBlock?: number,
  toBlock?: number
): Promise<BackfillResult> {
  await ensureCertificateIdHashes();
  const state = await getSyncState();
  const currentBlock = await provider.getBlockNumber();
  const latest = Math.min(toBlock ?? currentBlock, currentBlock);
  const start = Math.max(
    fromBlock ?? state.lastSyncedBlock + 1,
    env.DEPLOY_BLOCK
  );

  const result: BackfillResult = {
    fromBlock: start,
    toBlock: latest,
    processed: 0,
    issued: 0,
    revoked: 0,
    locked: 0,
    unlocked: 0,
    issuers: 0,
    skipped: 0,
  };

  if (start > latest) {
    return result;
  }

  // Quét theo từng đoạn nhỏ CHUNK_SIZE khối
  for (let from = start; from <= latest; from += CHUNK_SIZE) {
    const to = Math.min(from + CHUNK_SIZE - 1, latest);
    const logs = await provider.getLogs({
      address: env.CONTRACT_ADDRESS,
      fromBlock: from,
      toBlock: to,
    });

    for (const log of logs) {
      const event = parseLog(log);
      if (!event) {
        result.skipped += 1;
        continue;
      }

      try {
        const inserted = await processEvent(event, log);
        if (!inserted) {
          result.skipped += 1;
          continue;
        }

        result.processed += 1;
        if (event.name === "CertificateIssued") result.issued += 1;
        if (event.name === "CertificateRevoked") result.revoked += 1;
        if (event.name === "CertificateLocked") result.locked += 1;
        if (event.name === "CertificateUnlocked") result.unlocked += 1;
        if (event.name === "IssuerUpdated") result.issuers += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[sync] event failed ${log.transactionHash}: ${message}`);
      }
    }

    // Cập nhật điểm kiểm soát checkpoint sau mỗi phân đoạn khối hoàn thành
    state.lastSyncedBlock = to;
    await state.save();
  }

  return result;
}

/** Cờ mutex chống chồng lấn các lần quét khối đồng thời */
let syncing = false;

/**
 * Xử lý khi có khối mới xuất hiện trên mạng Blockchain
 */
async function onBlock(blockNumber: number): Promise<void> {
  if (syncing) return;
  syncing = true;

  try {
    await backfillEvents(undefined, blockNumber);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sync] block sync failed:", message);
  } finally {
    syncing = false;
  }
}

/** Hàm wrapper gọi onBlock không chặn tiến trình */
const blockHandler = (blockNumber: number): void => {
  void onBlock(blockNumber);
};

/**
 * Khởi động tiến trình đồng bộ dữ liệu:
 * 1. Quét bù toàn bộ sự kiện lịch sử còn thiếu
 * 2. Đăng ký lắng nghe sự kiện sinh khối mới theo thời gian thực
 */
export async function startSync(): Promise<void> {
  const result = await backfillEvents();
  console.log(
    `[sync] backfill ${result.fromBlock}→${result.toBlock}: ${result.processed} events`
  );

  provider.on("block", blockHandler);
  console.log("[sync] listener started");
}

/**
 * Dừng lắng nghe sự kiện sinh khối mới
 */
export function stopSync(): void {
  provider.off("block", blockHandler);
}

/**
 * Lấy trạng thái tiến độ đồng bộ hiện tại so với chuỗi khối
 */
export async function getSyncStatus(): Promise<{
  key: string;
  lastSyncedBlock: number;
  currentBlock: number;
  contractAddress: string;
  chainId: number;
}> {
  const state = await getSyncState();
  const currentBlock = await provider.getBlockNumber();

  return {
    key: state.key,
    lastSyncedBlock: state.lastSyncedBlock,
    currentBlock,
    contractAddress: state.contractAddress,
    chainId: state.chainId,
  };
}

/** Lớp dịch vụ đồng bộ sự kiện Blockchain */
export class SyncService {
  backfillEvents = backfillEvents;
  start = startSync;
  stop = stopSync;
  getStatus = getSyncStatus;
}

/** Thể hiện Singleton của SyncService dùng chung toàn ứng dụng */
export const syncService = new SyncService();
