/*
  Warnings:

  - The values [FREE,STANDARD,PREMIUM] on the enum `PlanType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'SUBSCRIPTION', 'PAYMENT', 'CONTENT', 'PROMO');

-- AlterEnum: PlanType FREE/STANDARD/PREMIUM → BASIC/TV/VOD/COMBO
-- Хуучин plan-уудыг шинэ plan руу maps хийнэ:
--   FREE     → BASIC
--   STANDARD → TV       (хуучны STANDARD = LIVE TV эрхтэй)
--   PREMIUM  → COMBO    (хуучны PREMIUM = LIVE TV + Premium VOD-той)
BEGIN;
CREATE TYPE "PlanType_new" AS ENUM ('BASIC', 'TV', 'VOD', 'COMBO');
ALTER TABLE "Subscription" ALTER COLUMN "planType" DROP DEFAULT;
ALTER TABLE "Subscription"
  ALTER COLUMN "planType" TYPE "PlanType_new"
  USING (
    CASE "planType"::text
      WHEN 'FREE'     THEN 'BASIC'::"PlanType_new"
      WHEN 'STANDARD' THEN 'TV'::"PlanType_new"
      WHEN 'PREMIUM'  THEN 'COMBO'::"PlanType_new"
      WHEN 'BASIC'    THEN 'BASIC'::"PlanType_new"
      WHEN 'TV'       THEN 'TV'::"PlanType_new"
      WHEN 'VOD'      THEN 'VOD'::"PlanType_new"
      WHEN 'COMBO'    THEN 'COMBO'::"PlanType_new"
      ELSE 'BASIC'::"PlanType_new"
    END
  );
ALTER TYPE "PlanType" RENAME TO "PlanType_old";
ALTER TYPE "PlanType_new" RENAME TO "PlanType";
DROP TYPE "PlanType_old";
ALTER TABLE "Subscription" ALTER COLUMN "planType" SET DEFAULT 'BASIC';
COMMIT;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "planType" SET DEFAULT 'BASIC';

-- CreateTable
CREATE TABLE "VodBundle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "price" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VodBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VodBundleItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "vodId" TEXT NOT NULL,

    CONSTRAINT "VodBundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundlePurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" "PurchaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundlePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VodBundleItem_bundleId_vodId_key" ON "VodBundleItem"("bundleId", "vodId");

-- CreateIndex
CREATE UNIQUE INDEX "BundlePurchase_userId_bundleId_key" ON "BundlePurchase"("userId", "bundleId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "VodBundleItem" ADD CONSTRAINT "VodBundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "VodBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VodBundleItem" ADD CONSTRAINT "VodBundleItem_vodId_fkey" FOREIGN KEY ("vodId") REFERENCES "VodContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundlePurchase" ADD CONSTRAINT "BundlePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundlePurchase" ADD CONSTRAINT "BundlePurchase_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "VodBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
