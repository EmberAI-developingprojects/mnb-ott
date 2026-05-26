/* One-off bootstrap: эхний SUPER_ADMIN үүсгэх (DB хоосон үед).
   Хэрэглээ:
     EMAIL=you@example.com PASSWORD=Strong123 NAME="Та" pnpm tsx scripts/bootstrap-admin.ts

   - Email + password-аар тэр даруйд нэвтрэх боломжтой
   - role: SUPER_ADMIN (бүх эрх)
   - isVerified: true (OTP алгасна) */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.EMAIL?.trim().toLowerCase();
  const password = process.env.PASSWORD;
  const name = process.env.NAME?.trim() || "Admin";

  if (!email || !password) {
    console.error("EMAIL болон PASSWORD env шаардлагатай.");
    console.error("Жишээ: EMAIL=admin@mnb.mn PASSWORD=Strong123 pnpm tsx scripts/bootstrap-admin.ts");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("PASSWORD дор хаяж 8 тэмдэгт байх ёстой.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ "${email}" хэрэглэгч аль хэдийн бий (role: ${existing.role}).`);
    if (existing.role !== "SUPER_ADMIN") {
      const updated = await prisma.user.update({
        where: { email },
        data:  { role: "SUPER_ADMIN", isVerified: true, isBlocked: false },
      });
      console.log(`→ Role-ийг SUPER_ADMIN болгож шинэчиллээ.`);
      console.log(updated);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password:   passwordHash,
      role:       "SUPER_ADMIN",
      isVerified: true,
      isBlocked:  false,
    },
  });

  /* BASIC subscription auto-create — frontend-д шууд нэвтэрсний дараа алдаа гарахгүй */
  await prisma.subscription.create({
    data: { userId: user.id, planType: "BASIC", status: "ACTIVE" },
  });

  console.log("✓ SUPER_ADMIN үүсгэлээ:");
  console.log({ id: user.id, email: user.email, name: user.name, role: user.role });
  console.log("\nОдоо http://localhost:3002 руу email + password-аар нэвтрэх боломжтой.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
