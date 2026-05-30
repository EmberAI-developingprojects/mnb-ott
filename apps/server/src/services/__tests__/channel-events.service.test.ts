import { describe, it, expect, vi, beforeEach } from "vitest";

/* LIVE event channel-уудад анхаарал төвлөрсөн admin CRUD тест.
   PPV LIVE event-үүд нь price, startsAt, endsAt тэй байх ёстой бөгөөд
   updateChannel + deleteChannel дотор date / NOT_FOUND логик зөв ажиллана. */

vi.mock("../../lib/prisma", () => ({
  prisma: {
    channel:  { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("../admin/audit.service", () => ({ audit: vi.fn() }));

/* Redis mock — CRUD нь channel cache-ийг invalidate хийдэг (redis.del). */
vi.mock("../../lib/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
  },
}));

import {
  listChannels, createChannel, updateChannel, deleteChannel,
} from "../admin/channels.service";
import { prisma } from "../../lib/prisma";

const findMany    = prisma.channel.findMany   as ReturnType<typeof vi.fn>;
const findUnique  = prisma.channel.findUnique as ReturnType<typeof vi.fn>;
const createCh    = prisma.channel.create     as ReturnType<typeof vi.fn>;
const updateCh    = prisma.channel.update     as ReturnType<typeof vi.fn>;
const deleteCh    = prisma.channel.delete     as ReturnType<typeof vi.fn>;

describe("listChannels — admin overview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("findMany-г kind + orderIndex-ээр sort хийж дуудна", async () => {
    findMany.mockResolvedValue([
      { id: "c1", kind: "TV",    orderIndex: 1 },
      { id: "c2", kind: "TV",    orderIndex: 2 },
      { id: "c3", kind: "RADIO", orderIndex: 1 },
      { id: "c4", kind: "LIVE",  orderIndex: 1 },
    ]);

    const res = await listChannels();
    expect(res).toHaveLength(4);
    expect(findMany).toHaveBeenCalledWith({
      orderBy: [{ kind: "asc" }, { orderIndex: "asc" }],
    });
  });
});

describe("createChannel — LIVE event create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createCh.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      ({ id: "live-1", ...data }));
  });

  it("LIVE event-ийг price + startsAt + endsAt-тай үүсгэнэ", async () => {
    const startsAt = "2026-06-15T18:00:00.000Z";
    const endsAt   = "2026-06-15T21:00:00.000Z";

    const res = await createChannel("admin1", {
      name:       "Тоглолт: МНБ vs Эрчим",
      slug:       "match-mnb-erchim",
      kind:       "LIVE",
      price:      8000,
      startsAt,
      endsAt,
      isActive:   true,
      orderIndex: 1,
    });

    expect(res).toMatchObject({ name: "Тоглолт: МНБ vs Эрчим", kind: "LIVE", price: 8000 });
    /* startsAt/endsAt нь Date instance болсон байх ёстой (string биш) */
    const callArg = createCh.mock.calls[0][0] as { data: { startsAt: Date; endsAt: Date } };
    expect(callArg.data.startsAt).toBeInstanceOf(Date);
    expect(callArg.data.endsAt).toBeInstanceOf(Date);
    expect((callArg.data.startsAt as Date).toISOString()).toBe(startsAt);
    expect((callArg.data.endsAt   as Date).toISOString()).toBe(endsAt);
  });

  it("startsAt/endsAt байхгүй үед null шилжүүлнэ", async () => {
    await createChannel("admin1", {
      name: "TV Channel", slug: "tv-1", kind: "TV",
    });
    const callArg = createCh.mock.calls[0][0] as { data: { startsAt: Date | null; endsAt: Date | null } };
    expect(callArg.data.startsAt).toBeNull();
    expect(callArg.data.endsAt).toBeNull();
  });
});

describe("updateChannel — startsAt/endsAt update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUnique.mockResolvedValue({
      id: "live-1", name: "Old", kind: "LIVE", price: 5000,
      startsAt: new Date("2026-06-01T00:00:00Z"), endsAt: new Date("2026-06-01T03:00:00Z"),
    });
    updateCh.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      ({ id: "live-1", ...data }));
  });

  it("startsAt + endsAt-ийг шинэ огноо болгож зөв Date-руу хувиргана", async () => {
    const newStart = "2026-07-10T12:00:00.000Z";
    const newEnd   = "2026-07-10T15:00:00.000Z";

    await updateChannel("admin1", "live-1", {
      startsAt: newStart,
      endsAt:   newEnd,
      price:    9500,
    });

    const callArg = updateCh.mock.calls[0][0] as {
      where: { id: string };
      data:  { startsAt: Date; endsAt: Date; price: number };
    };
    expect(callArg.where.id).toBe("live-1");
    expect(callArg.data.startsAt).toBeInstanceOf(Date);
    expect(callArg.data.endsAt).toBeInstanceOf(Date);
    expect(callArg.data.price).toBe(9500);
    expect(callArg.data.startsAt.toISOString()).toBe(newStart);
    expect(callArg.data.endsAt.toISOString()).toBe(newEnd);
  });

  it("startsAt null болгоход null утга шилждэнэ (event цуцлах)", async () => {
    await updateChannel("admin1", "live-1", { startsAt: null, endsAt: null });
    const callArg = updateCh.mock.calls[0][0] as {
      data: { startsAt: Date | null; endsAt: Date | null };
    };
    expect(callArg.data.startsAt).toBeNull();
    expect(callArg.data.endsAt).toBeNull();
  });

  it("Channel байхгүй үед NOT_FOUND throw хийнэ", async () => {
    findUnique.mockResolvedValue(null);
    await expect(updateChannel("admin1", "missing", { name: "x" }))
      .rejects.toThrow(/Channel олдсонгүй/);
    expect(updateCh).not.toHaveBeenCalled();
  });
});

describe("deleteChannel — NOT_FOUND", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Channel олдохгүй үед NOT_FOUND throw хийгээд delete дуудагдахгүй", async () => {
    findUnique.mockResolvedValue(null);
    await expect(deleteChannel("admin1", "missing"))
      .rejects.toThrow(/Channel олдсонгүй/);
    expect(deleteCh).not.toHaveBeenCalled();
  });

  it("LIVE channel олдвол delete хийгдэнэ", async () => {
    findUnique.mockResolvedValue({ id: "live-9", kind: "LIVE", name: "Тоглолт" });
    deleteCh.mockResolvedValue({ id: "live-9" });

    await deleteChannel("admin1", "live-9");
    expect(deleteCh).toHaveBeenCalledWith({ where: { id: "live-9" } });
  });
});
