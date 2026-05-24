import { describe, it, expect, vi, beforeEach } from "vitest";

/* Channel CRUD дотор LIVE-ийн singleton constraint-ийг тестлэнэ. */

vi.mock("../../lib/prisma", () => ({
  prisma: {
    channel:  { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

import { createChannel } from "../admin/channels.service";
import { prisma } from "../../lib/prisma";

const findFirst = prisma.channel.findFirst as ReturnType<typeof vi.fn>;
const createCh  = prisma.channel.create as ReturnType<typeof vi.fn>;

describe("createChannel — LIVE singleton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createCh.mockResolvedValue({ id: "c1" });
    (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("LIVE суваг байхгүй үед LIVE үүсгэж болно", async () => {
    findFirst.mockResolvedValue(null);
    await expect(createChannel("admin1", {
      name: "МНБ Live", slug: "mnb-live", kind: "LIVE",
    })).resolves.toBeDefined();
  });

  it("Хоёр дахь LIVE үүсгэхийг хориглоно", async () => {
    findFirst.mockResolvedValue({ id: "live-1" }); /* Аль хэдийн нэг LIVE бий */
    await expect(createChannel("admin1", {
      name: "Хоёр дахь", slug: "second-live", kind: "LIVE",
    })).rejects.toThrow();
  });

  it("TV суваг олон удаа үүсгэж болно", async () => {
    findFirst.mockResolvedValue(null);
    await expect(createChannel("admin1", {
      name: "МНБ 1", slug: "mnb-1", kind: "TV",
    })).resolves.toBeDefined();
    await expect(createChannel("admin1", {
      name: "МНБ 2", slug: "mnb-2", kind: "TV",
    })).resolves.toBeDefined();
  });

  it("Олон RADIO үүсгэж болно", async () => {
    findFirst.mockResolvedValue(null);
    await expect(createChannel("admin1", {
      name: "Radio 1", slug: "radio-1", kind: "RADIO",
    })).resolves.toBeDefined();
    await expect(createChannel("admin1", {
      name: "Radio 2", slug: "radio-2", kind: "RADIO",
    })).resolves.toBeDefined();
  });
});
