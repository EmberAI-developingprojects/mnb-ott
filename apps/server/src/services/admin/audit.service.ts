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
   payment → "{user} — {amount}₮"

   Optimization: 5 sequential await → 1 batched `$transaction`. Audit log
   ачаалах бүрт DB roundtrip 5 → 1 болж буурна. */
async function enrichTargets(
  items: { targetType: string; targetId: string | null }[],
): Promise<Map<string, string>> {
  const byType = new Map<string, Set<string>>();
  for (const it of items) {
    if (!it.targetId) continue;
    if (!byType.has(it.targetType)) byType.set(it.targetType, new Set());
    byType.get(it.targetType)!.add(it.targetId);
  }

  /* Type бүрд array хөрвүүлэх (хоосон бол []) */
  const userIds    = Array.from(byType.get("user")    ?? []);
  const vodIds     = Array.from(byType.get("vod")     ?? []);
  const channelIds = Array.from(byType.get("channel") ?? []);
  const bundleIds  = Array.from(byType.get("bundle")  ?? []);
  const paymentIds = Array.from(byType.get("payment") ?? []);

  /* Бүх 5 query-г нэг roundtrip-д. Хоосон array-уудыг ч skip хийнэ
     (Prisma `in: []` дээр query явдаггүй). */
  const [users, vods, channels, bundles, payments] = await prisma.$transaction([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, phone: true },
    }),
    prisma.vodContent.findMany({
      where: { id: { in: vodIds } },
      select: { id: true, title: true },
    }),
    prisma.channel.findMany({
      where: { id: { in: channelIds } },
      select: { id: true, name: true },
    }),
    prisma.vodBundle.findMany({
      where: { id: { in: bundleIds } },
      select: { id: true, title: true },
    }),
    prisma.payment.findMany({
      where: { id: { in: paymentIds } },
      select: { id: true, amount: true, user: { select: { name: true, email: true, phone: true } } },
    }),
  ]);

  const names = new Map<string, string>();
  for (const u of users)    names.set(`user:${u.id}`,    u.name ?? u.email ?? u.phone ?? u.id);
  for (const v of vods)     names.set(`vod:${v.id}`,     v.title);
  for (const c of channels) names.set(`channel:${c.id}`, c.name);
  for (const b of bundles)  names.set(`bundle:${b.id}`,  b.title);
  for (const p of payments) {
    const who = p.user.name ?? p.user.email ?? p.user.phone ?? "—";
    names.set(`payment:${p.id}`, `${who} — ${p.amount.toLocaleString("mn-MN")}₮`);
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
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0066B2" } };
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
