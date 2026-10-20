import { keccak256, toUtf8Bytes, type Log } from "ethers";
import { env } from "../config/env";
import { Certificate, ChainEvent, Issuer, SyncState } from "../models";
import { provider, registry } from "./chain.service";

const SYNC_KEY = "certificate_registry";
const CHUNK_SIZE = 5_000;

let hashesEnsured = false;

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

interface ParsedEvent {
  name: string;
  args: Record<string, unknown>;
}

export interface BackfillResult {
  fromBlock: number;
  toBlock: number;
  processed: number;
  issued: number;
  revoked: number;
  issuers: number;
  skipped: number;
}

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

async function applyEvent(event: ParsedEvent, log: Log): Promise<void> {
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
          },
        }
      );
    }
    return;
  }

  if (event.name === "IssuerUpdated") {
    const wallet = String(event.args.issuer).toLowerCase();
    const active = Boolean(event.args.active);
    const name = String(event.args.name);

    const updates: Record<string, unknown> = { onChainActive: active };
    if (name) updates.name = name;
    if (active) updates.chainAddedAt = new Date();

    await Issuer.updateOne({ walletAddress: wallet }, { $set: updates });
  }
}

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

async function processEvent(event: ParsedEvent, log: Log): Promise<boolean> {
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
    if (!message.includes("duplicate key")) {
      throw error;
    }
  }

  return true;
}

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
    issuers: 0,
    skipped: 0,
  };

  if (start > latest) {
    return result;
  }

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
        if (event.name === "IssuerUpdated") result.issuers += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[sync] event failed ${log.transactionHash}: ${message}`);
      }
    }

    state.lastSyncedBlock = to;
    await state.save();
  }

  return result;
}

let syncing = false;

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

const blockHandler = (blockNumber: number): void => {
  void onBlock(blockNumber);
};

export async function startSync(): Promise<void> {
  const result = await backfillEvents();
  console.log(
    `[sync] backfill ${result.fromBlock}→${result.toBlock}: ${result.processed} events`
  );

  provider.on("block", blockHandler);
  console.log("[sync] listener started");
}

export function stopSync(): void {
  provider.off("block", blockHandler);
}

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

export class SyncService {
  backfillEvents = backfillEvents;
  start = startSync;
  stop = stopSync;
  getStatus = getSyncStatus;
}

export const syncService = new SyncService();
