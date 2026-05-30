import { describe, it, expect, vi, beforeEach } from "vitest";

/* Channel CRUD — шинэ v2 загвар: LIVE singleton хязгаар арилсан.
   LIVE event-үүд олон удаа үүсгэх боломжтой (event бүр өөр PPV). */

vi.mock("../../lib/prisma", () => ({
  prisma: {
    channel:  { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

/* Redis mock — create/update/delete нь channel cache-ийг invalidate хийдэг
   (invalidateChannelsCache → redis.del). Бодит redis холболтоос зайлсхийнэ. */
vi.mock("../../lib/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
  },
}));

import { createChannel } from "../admin/channels.service";
import { prisma } from "../../lib/prisma";

const createCh = prisma.channel.create as ReturnType<typeof vi.fn>;

describe("createChannel — channel CRUD (v2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createCh.mockResolvedValue({ id: "c1" });
    (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("LIVE event-ийг олон удаа үүсгэж болно (нэг event = нэг LIVE channel)", async () => {
    await expect(createChannel("admin1", {
      name: "Match 1", slug: "match-1", kind: "LIVE", price: 5000,
    })).resolves.toBeDefined();
    await expect(createChannel("admin1", {
      name: "Match 2", slug: "match-2", kind: "LIVE", price: 7000,
    })).resolves.toBeDefined();
  });

  it("TV суваг олон удаа үүсгэж болно", async () => {
    await expect(createChannel("admin1", {
      name: "МНБ 1", slug: "mnb-1", kind: "TV",
    })).resolves.toBeDefined();
    await expect(createChannel("admin1", {
      name: "МНБ 2", slug: "mnb-2", kind: "TV",
    })).resolves.toBeDefined();
  });

  it("Олон RADIO үүсгэж болно", async () => {
    await expect(createChannel("admin1", {
      name: "Radio 1", slug: "radio-1", kind: "RADIO",
    })).resolves.toBeDefined();
    await expect(createChannel("admin1", {
      name: "Radio 2", slug: "radio-2", kind: "RADIO",
    })).resolves.toBeDefined();
  });
});
