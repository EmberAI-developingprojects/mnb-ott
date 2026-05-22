import { prisma } from "../../lib/prisma";

/* Admin доторх бүх write үйлдлийн дараа дуудах helper. Бусад модуль үүнийг
   импортолж ашиглана. */
export async function audit(input: {
  actorUserId: string;
  targetType:  string;
  targetId?:   string;
  action:      string;
  before?:     unknown;
  after?:      unknown;
  reason?:     string;
  ip?:         string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      targetType:  input.targetType,
      targetId:    input.targetId,
      action:      input.action,
      before:      input.before === undefined ? undefined : (input.before as object),
      after:       input.after  === undefined ? undefined : (input.after  as object),
      reason:      input.reason,
      ip:          input.ip,
    },
  });
}

export interface EnrichedAuditLog {
  id:          string;
  actorUserId: string;
  targetType:  string;
  targetId:    string | null;
  targetName:  string | null;
  action:      string;
  before:      unknown;
  after:       unknown;
  reason:      string | null;
  ip:          string | null;
  createdAt:   Date;
  actor: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: string;
  };
}

/* Target ID-аас тухайн объектын харагдах нэрийг авна. Хэлбэр:
   user → name/email/phone, vod → title, channel → name, bundle → title,
   payment → "{user} — {amount}₮" */
async function enrichTargets(
  items: { targetType: string; targetId: string | null }[],
): Promise<Map<string, string>> {
  const byType = new Map<string, Set<string>>();
  for (const it of items) {
    if (!it.targetId) continue;
    if (!byType.has(it.targetType)) byType.set(it.targetType, new Set());
    byType.get(it.targetType)!.add(it.targetId);
  }
  const names = new Map<string, string>();

  if (byType.has("user")) {
    const ids = Array.from(byType.get("user")!);
    const us = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true, phone: true } });
    for (const u of us) names.set(`user:${u.id}`, u.name ?? u.email ?? u.phone ?? u.id);
  }
  if (byType.has("vod")) {
    const ids = Array.from(byType.get("vod")!);
    const vs = await prisma.vodContent.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
    for (const v of vs) names.set(`vod:${v.id}`, v.title);
  }
  if (byType.has("channel")) {
    const ids = Array.from(byType.get("channel")!);
    const cs = await prisma.channel.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    for (const c of cs) names.set(`channel:${c.id}`, c.name);
  }
  if (byType.has("bundle")) {
    const ids = Array.from(byType.get("bundle")!);
    const bs = await prisma.vodBundle.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
    for (const b of bs) names.set(`bundle:${b.id}`, b.title);
  }
  if (byType.has("payment")) {
    const ids = Array.from(byType.get("payment")!);
    const ps = await prisma.payment.findMany({
      where: { id: { in: ids } },
      select: { id: true, amount: true, user: { select: { name: true, email: true, phone: true } } },
    });
    for (const p of ps) {
      const who = p.user.name ?? p.user.email ?? p.user.phone ?? "—";
      names.set(`payment:${p.id}`, `${who} — ${p.amount.toLocaleString("mn-MN")}₮`);
    }
  }
  return names;
}

export async function listAuditLogs(opts: {
  page?:        number;
  pageSize?:    number;
  targetType?:  string;
  actorUserId?: string;
  from?:        Date;
  to?:          Date;
}): Promise<{ items: EnrichedAuditLog[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const take = Math.min(500, opts.pageSize ?? 50);
  const skip = (page - 1) * take;

  const where = {
    ...(opts.targetType  ? { targetType:  opts.targetType  } : {}),
    ...(opts.actorUserId ? { actorUserId: opts.actorUserId } : {}),
    ...(opts.from || opts.to ? {
      createdAt: {
        ...(opts.from ? { gte: opts.from } : {}),
        ...(opts.to   ? { lte: opts.to   } : {}),
      },
    } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, skip, take,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { id: true, name: true, email: true, phone: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const names = await enrichTargets(items);
  const enriched: EnrichedAuditLog[] = items.map((it) => ({
    ...it,
    targetName: it.targetId ? (names.get(`${it.targetType}:${it.targetId}`) ?? null) : null,
  }));

  return { items: enriched, total, page, pageSize: take };
}

/* XLSX экспорт — Native Excel формат. Office онлайнд шууд нээгдэнэ. */
export async function exportAuditXlsx(opts: { targetType?: string; from?: Date; to?: Date }): Promise<Buffer> {
  const ExcelJS = await import("exceljs");
  const all = await listAuditLogs({ ...opts, page: 1, pageSize: 500 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "МҮОНРТ OTT Admin";
  wb.created = new Date();

  const sheet = wb.addWorksheet("Үйлдлийн түүх");
  sheet.columns = [
    { header: "Огноо",        key: "createdAt", width: 20 },
    { header: "Админ",        key: "actor",     width: 24 },
    { header: "Роль",         key: "role",      width: 14 },
    { header: "IP",           key: "ip",        width: 16 },
    { header: "Үйлдэл",       key: "action",    width: 14 },
    { header: "Чигт",         key: "target",    width: 12 },
    { header: "Чигтийн нэр",  key: "name",      width: 32 },
    { header: "Шалтгаан",     key: "reason",    width: 30 },
    { header: "Өмнө (JSON)",  key: "before",    width: 40 },
    { header: "Дараа (JSON)", key: "after",     width: 40 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0046A5" } };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  headerRow.height = 22;

  for (const it of all.items) {
    sheet.addRow({
      createdAt: new Date(it.createdAt).toLocaleString("mn-MN"),
      actor:     it.actor.name ?? it.actor.email ?? it.actor.phone ?? "",
      role:      it.actor.role,
      ip:        it.ip ?? "",
      action:    it.action,
      target:    it.targetType,
      name:      it.targetName ?? "",
      reason:    it.reason ?? "",
      before:    it.before ? JSON.stringify(it.before) : "",
      after:     it.after  ? JSON.stringify(it.after)  : "",
    });
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}
