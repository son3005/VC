/**
 * @file sync.service.test.ts
 * @description Kiểm thử đơn vị (Unit Tests) cho dịch vụ đồng bộ sự kiện Blockchain về Cơ sở dữ liệu (backfillEvents).
 * 
 * Kiểm tra các tính năng và quy tắc đồng bộ sự kiện cốt lõi:
 * 1. Xử lý sự kiện CertificateIssued:
 *    - Bóc tách dữ liệu sự kiện (idHash, certificateId, fileHash, issuer, issuedAt).
 *    - Bổ sung các trường còn thiếu vào MongoDB (certificateIdHash, txHash, blockNumber).
 *    - Ghi nhận lịch sử bất biến vào bảng ChainEvent và cập nhật mốc checkpoint trong SyncState.
 * 2. Xử lý sự kiện CertificateRevoked:
 *    - Tìm kiếm bản ghi văn bằng thông qua `idHash` và cập nhật trạng thái `revoked` cùng mã giao dịch thu hồi.
 * 3. Xử lý sự kiện IssuerUpdated:
 *    - Cập nhật trạng thái kích hoạt trên chuỗi (`onChainActive: true/false`) của đơn vị phát hành.
 * 4. Cơ chế chống trùng lặp sự kiện (Deduplication / Idempotency):
 *    - Bỏ qua các sự kiện đã tồn tại trong bảng `ChainEvent`.
 * 5. Cơ chế bảo vệ điểm kiểm soát (Checkpoint Guard):
 *    - Không quét lại nếu dải khối yêu cầu nằm phía sau điểm checkpoint đã đồng bộ.
 */

jest.mock("../../models", () => ({
  Certificate: {
    find: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
  ChainEvent: {
    exists: jest.fn(),
    create: jest.fn(),
  },
  Issuer: { updateOne: jest.fn() },
  SyncState: { findOne: jest.fn(), create: jest.fn() },
}));

jest.mock("../chain.service", () => ({
  provider: {
    getBlockNumber: jest.fn(),
    getLogs: jest.fn(),
  },
  registry: {
    interface: { parseLog: jest.fn() },
  },
}));

import { env } from "../../config/env";
import {
  Certificate,
  ChainEvent,
  Issuer,
  SyncState,
} from "../../models";
import { provider, registry } from "../chain.service";
import { backfillEvents } from "../sync.service";

const certificateFind = Certificate.find as jest.Mock;
const certificateFindOne = Certificate.findOne as jest.Mock;
const certificateUpdateOne = Certificate.updateOne as jest.Mock;
const chainEventExists = ChainEvent.exists as jest.Mock;
const chainEventCreate = ChainEvent.create as jest.Mock;
const issuerUpdateOne = Issuer.updateOne as jest.Mock;
const syncStateFindOne = SyncState.findOne as jest.Mock;
const getLogs = provider.getLogs as jest.Mock;
const parseLog = registry.interface.parseLog as jest.Mock;

const TX = "0x" + "a".repeat(64);
const ISSUER = "0xf009863379f6b0056c1d828fde2827fd94202a1b";

/**
 * Hàm khởi tạo trạng thái đồng bộ SyncState mẫu
 */
function makeState(lastSyncedBlock = env.DEPLOY_BLOCK) {
  return {
    key: "certificate_registry",
    lastSyncedBlock,
    save: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Hàm khởi tạo log sự kiện thô từ JSON-RPC Provider
 */
function makeLog(blockNumber = env.DEPLOY_BLOCK + 1) {
  return {
    address: env.CONTRACT_ADDRESS,
    transactionHash: TX,
    blockNumber,
    index: 1,
    topics: [],
    data: "0x",
  };
}

/**
 * Hàm trợ giúp mô phỏng kết quả phân tích log của Ethers Interface
 */
function parsed(
  name: string,
  inputs: string[],
  args: unknown[]
): {
  name: string;
  fragment: { inputs: Array<{ name: string }> };
  args: unknown[];
} {
  return {
    name,
    fragment: { inputs: inputs.map((input) => ({ name: input })) },
    args,
  };
}

describe("backfillEvents", () => {
  let state: ReturnType<typeof makeState>;

  beforeEach(() => {
    jest.clearAllMocks();
    state = makeState();
    syncStateFindOne.mockResolvedValue(state);
    certificateFind.mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });
    chainEventExists.mockResolvedValue(false);
    chainEventCreate.mockResolvedValue({});
    certificateUpdateOne.mockResolvedValue({});
    issuerUpdateOne.mockResolvedValue({});
    getLogs.mockResolvedValue([]);
    (provider.getBlockNumber as jest.Mock).mockResolvedValue(
      env.DEPLOY_BLOCK + 10
    );
  });

  /**
   * Test case 1: Xử lý sự kiện CertificateIssued và điền đầy đủ các trường mã băm/giao dịch
   * Cập nhật certificateIdHash, txHash cho chứng chỉ, lưu ChainEvent và tăng lastSyncedBlock.
   */
  it("processes CertificateIssued and fills missing hash/tx fields", async () => {
    const log = makeLog();
    getLogs.mockResolvedValue([log]);
    parseLog.mockReturnValue(
      parsed(
        "CertificateIssued",
        ["idHash", "certificateId", "fileHash", "issuer", "issuedAt"],
        [
          "0x" + "b".repeat(64),
          "UIT-DEG-2026-0001",
          "sha256:" + "c".repeat(64),
          ISSUER,
          1792467192,
        ]
      )
    );

    certificateFindOne.mockResolvedValue({
      _id: "cert-1",
      certificateId: "UIT-DEG-2026-0001",
      certificateIdHash: null,
      txHash: "",
      blockNumber: 0,
      logIndex: 0,
      status: "active",
    });

    const result = await backfillEvents(env.DEPLOY_BLOCK + 1, env.DEPLOY_BLOCK + 2);

    expect(result.processed).toBe(1);
    expect(result.issued).toBe(1);
    expect(certificateUpdateOne).toHaveBeenCalledWith(
      { _id: "cert-1" },
      {
        $set: expect.objectContaining({
          certificateIdHash: "0x" + "b".repeat(64),
          txHash: TX,
        }),
      }
    );
    expect(chainEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "CertificateIssued",
        txHash: TX,
        logIndex: 1,
      })
    );
    expect(state.lastSyncedBlock).toBe(env.DEPLOY_BLOCK + 2);
    expect(state.save).toHaveBeenCalled();
  });

  /**
   * Test case 2: Xử lý sự kiện CertificateRevoked theo idHash
   * Tìm kiếm văn bằng qua certificateIdHash và cập nhật trạng thái 'revoked' cùng thông tin block/tx.
   */
  it("processes CertificateRevoked by idHash", async () => {
    const log = makeLog();
    const idHash = "0x" + "d".repeat(64);
    getLogs.mockResolvedValue([log]);
    parseLog.mockReturnValue(
      parsed(
        "CertificateRevoked",
        ["idHash", "issuer", "revokedAt"],
        [idHash, ISSUER, 1792467200]
      )
    );

    certificateFindOne.mockResolvedValue({
      _id: "cert-1",
      certificateId: "UIT-DEG-2026-0001",
      status: "active",
    });

    const result = await backfillEvents(env.DEPLOY_BLOCK + 1, env.DEPLOY_BLOCK + 2);

    expect(result.revoked).toBe(1);
    expect(certificateFindOne).toHaveBeenCalledWith({
      certificateIdHash: idHash,
    });
    expect(certificateUpdateOne).toHaveBeenCalledWith(
      { _id: "cert-1" },
      {
        $set: expect.objectContaining({
          status: "revoked",
          revokeTxHash: TX,
          revokeBlockNumber: log.blockNumber,
        }),
      }
    );
  });

  /**
   * Test case 3: Xử lý sự kiện IssuerUpdated và cập nhật cờ onChainActive
   */
  it("processes IssuerUpdated and toggles onChainActive", async () => {
    const log = makeLog();
    getLogs.mockResolvedValue([log]);
    parseLog.mockReturnValue(
      parsed(
        "IssuerUpdated",
        ["issuer", "name", "active"],
        [ISSUER, "Khoa Công nghệ Thông tin", true]
      )
    );

    const result = await backfillEvents(env.DEPLOY_BLOCK + 1, env.DEPLOY_BLOCK + 2);

    expect(result.issuers).toBe(1);
    expect(issuerUpdateOne).toHaveBeenCalledWith(
      { walletAddress: ISSUER },
      { $set: expect.objectContaining({ onChainActive: true }) }
    );
  });

  /**
   * Test case 4: Bỏ qua các sự kiện đã được ghi nhận trước đó trong bảng chain_events
   * Đảm bảo tính chống lặp (Deduplication) khi quét lại các khối cũ.
   */
  it("skips events already recorded in chain_events", async () => {
    const log = makeLog();
    getLogs.mockResolvedValue([log]);
    parseLog.mockReturnValue(
      parsed(
        "IssuerUpdated",
        ["issuer", "name", "active"],
        [ISSUER, "Khoa", false]
      )
    );
    chainEventExists.mockResolvedValue(true);

    const result = await backfillEvents(env.DEPLOY_BLOCK + 1, env.DEPLOY_BLOCK + 2);

    expect(result.processed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(issuerUpdateOne).not.toHaveBeenCalled();
  });

  /**
   * Test case 5: Không quét khi dải khối yêu cầu nằm phía sau điểm checkpoint đã lưu
   */
  it("does not scan when the requested range is behind the checkpoint", async () => {
    syncStateFindOne.mockResolvedValue(makeState(env.DEPLOY_BLOCK + 5));

    const result = await backfillEvents(undefined, env.DEPLOY_BLOCK);

    expect(result.processed).toBe(0);
    expect(getLogs).not.toHaveBeenCalled();
  });
});
