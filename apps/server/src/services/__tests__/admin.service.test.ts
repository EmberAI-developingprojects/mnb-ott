import { describe, it, expect, vi, beforeEach } from "vitest";

/* Admin service-ийн role change & ban зэрэг эрхийн дүрмүүдийг тестлэнэ.
   Зорилго: privilege escalation эсвэл сүүлчийн SUPER_ADMIN-ийг demote хийх
   зэрэг security rule-уудыг кодын түвшинд баталгаажуулах. */

vi.mock("../../lib/prisma", () => ({
  prisma: {
    user:     { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    auditLog: { create: vi.fn() },
    userSession: { updateMany: vi.fn() },
  },
}));

import { changeUserRole, setUserBlocked } from "../admin/users.service";
import { prisma } from "../../lib/prisma";

const findUser = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const countUser = prisma.user.count as ReturnType<typeof vi.fn>;

describe("changeUserRole — privilege escalation хамгаалалт", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("ADMIN нь USER-ийг EDITOR болгож чадна", async () => {
    findUser.mockResolvedValue({ id: "u2", role: "USER" });
    await expect(changeUserRole({
      actorUserId: "u1", actorRole: "ADMIN",
      targetUserId: "u2", newRole: "EDITOR",
    })).resolves.toBeDefined();
  });

  it("ADMIN нь өөр ADMIN-ийг өөрчилж чадахгүй (өндөр зэрэглэлтэй)", async () => {
    findUser.mockResolvedValue({ id: "u2", role: "ADMIN" });
    await expect(changeUserRole({
      actorUserId: "u1", actorRole: "ADMIN",
      targetUserId: "u2", newRole: "USER",
    })).rejects.toThrow();
  });

  it("ADMIN нь хэрэглэгчийг ADMIN болгож чадахгүй (өөрөөсөө дээш promote)", async () => {
    findUser.mockResolvedValue({ id: "u2", role: "USER" });
    await expect(changeUserRole({
      actorUserId: "u1", actorRole: "ADMIN",
      targetUserId: "u2", newRole: "ADMIN",
    })).rejects.toThrow();
  });

  it("SUPER_ADMIN нь хэрэглэгчийг ADMIN болгож чадна", async () => {
    findUser.mockResolvedValue({ id: "u2", role: "USER" });
    await expect(changeUserRole({
      actorUserId: "u1", actorRole: "SUPER_ADMIN",
      targetUserId: "u2", newRole: "ADMIN",
    })).resolves.toBeDefined();
  });

  it("Өөрийнхөө role-ийг өөрчилж чадахгүй", async () => {
    await expect(changeUserRole({
      actorUserId: "u1", actorRole: "SUPER_ADMIN",
      targetUserId: "u1", newRole: "USER",
    })).rejects.toThrow();
  });

  it("Сүүлчийн SUPER_ADMIN-ийг demote хийж болохгүй", async () => {
    findUser.mockResolvedValue({ id: "u2", role: "SUPER_ADMIN" });
    countUser.mockResolvedValue(1); // зөвхөн нэг SUPER_ADMIN

    await expect(changeUserRole({
      actorUserId: "u1", actorRole: "SUPER_ADMIN",
      targetUserId: "u2", newRole: "ADMIN",
    })).rejects.toThrow();
  });

  it("Олон SUPER_ADMIN байвал нэгийг нь demote хийж болно", async () => {
    findUser.mockResolvedValue({ id: "u2", role: "SUPER_ADMIN" });
    countUser.mockResolvedValue(2);
    await expect(changeUserRole({
      actorUserId: "u1", actorRole: "SUPER_ADMIN",
      targetUserId: "u2", newRole: "ADMIN",
    })).resolves.toBeDefined();
  });
});

describe("setUserBlocked — ban rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.userSession.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("Өөрийгөө ban хийж чадахгүй", async () => {
    await expect(setUserBlocked({
      actorUserId: "u1", actorRole: "ADMIN",
      targetUserId: "u1", blocked: true,
    })).rejects.toThrow();
  });

  it("ADMIN нь USER-ийг ban хийж чадна", async () => {
    findUser.mockResolvedValue({ id: "u2", role: "USER", isBlocked: false });
    await expect(setUserBlocked({
      actorUserId: "u1", actorRole: "ADMIN",
      targetUserId: "u2", blocked: true, reason: "spam",
    })).resolves.toBeDefined();
  });

  it("ADMIN нь өөр ADMIN-ийг ban хийж чадахгүй", async () => {
    findUser.mockResolvedValue({ id: "u2", role: "ADMIN", isBlocked: false });
    await expect(setUserBlocked({
      actorUserId: "u1", actorRole: "ADMIN",
      targetUserId: "u2", blocked: true,
    })).rejects.toThrow();
  });

  it("Ban хийсэн үед target-ийн идэвхтэй session-ууд хаагдана", async () => {
    findUser.mockResolvedValue({ id: "u2", role: "USER", isBlocked: false });
    await setUserBlocked({
      actorUserId: "u1", actorRole: "ADMIN",
      targetUserId: "u2", blocked: true,
    });
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u2", isActive: true } }),
    );
  });
});
