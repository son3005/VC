jest.mock("../../models", () => ({
  Certificate: {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
  },
  Issuer: { countDocuments: jest.fn() },
  User: { countDocuments: jest.fn() },
}));

import { Certificate, Issuer, User } from "../../models";
import { getAdminStats } from "../admin.service";

const certificateCount = Certificate.countDocuments as jest.Mock;
const issuerCount = Issuer.countDocuments as jest.Mock;
const userCount = User.countDocuments as jest.Mock;
const aggregate = Certificate.aggregate as jest.Mock;
const find = Certificate.find as jest.Mock;

describe("getAdminStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns certificate, issuer and user totals with recent items", async () => {
    certificateCount
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(3);
    issuerCount.mockResolvedValueOnce(4).mockResolvedValueOnce(3);
    userCount.mockResolvedValueOnce(5);

    aggregate.mockResolvedValue([
      { _id: "degree", count: 6 },
      { _id: "course", count: 4 },
    ]);

    find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([
          {
            certificateId: "UIT-DEG-2026-0001",
            studentName: "Nguyễn Văn An",
            studentCode: "2311095",
            certificateType: "degree",
            status: "active",
            issuedAt: new Date("2026-10-19T08:00:00.000Z"),
          },
        ]),
      }),
    });

    const stats = await getAdminStats();

    expect(stats.certificates).toEqual({ total: 10, active: 7, revoked: 3 });
    expect(stats.issuers).toEqual({ total: 4, active: 3 });
    expect(stats.users).toBe(5);
    expect(stats.byType).toEqual({
      degree: 6,
      course: 4,
      credit: 0,
      other: 0,
    });
    expect(stats.recent).toHaveLength(1);
    expect(stats.recent[0]).toEqual(
      expect.objectContaining({
        certificateId: "UIT-DEG-2026-0001",
        status: "active",
      })
    );
  });

  it("returns zeroed type counts when there are no certificates", async () => {
    certificateCount.mockResolvedValue(0);
    issuerCount.mockResolvedValue(0);
    userCount.mockResolvedValue(0);
    aggregate.mockResolvedValue([]);
    find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
      }),
    });

    const stats = await getAdminStats();

    expect(stats.byType).toEqual({
      degree: 0,
      course: 0,
      credit: 0,
      other: 0,
    });
    expect(stats.recent).toEqual([]);
  });
});
