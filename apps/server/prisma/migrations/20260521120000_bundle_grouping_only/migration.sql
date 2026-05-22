-- Bundle = grouping only. Each video inside is rented individually via Purchase table.
-- BundlePurchase болон VodBundle.price-ийг устгана.

-- DropForeignKey
ALTER TABLE "BundlePurchase" DROP CONSTRAINT IF EXISTS "BundlePurchase_userId_fkey";
ALTER TABLE "BundlePurchase" DROP CONSTRAINT IF EXISTS "BundlePurchase_bundleId_fkey";

-- DropTable
DROP TABLE IF EXISTS "BundlePurchase";

-- AlterTable — VodBundle-аас price хасч, orderIndex нэмнэ
ALTER TABLE "VodBundle" DROP COLUMN IF EXISTS "price";
ALTER TABLE "VodBundle" ADD COLUMN IF NOT EXISTS "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- AlterTable — VodBundleItem-д orderIndex
ALTER TABLE "VodBundleItem" ADD COLUMN IF NOT EXISTS "orderIndex" INTEGER NOT NULL DEFAULT 0;
