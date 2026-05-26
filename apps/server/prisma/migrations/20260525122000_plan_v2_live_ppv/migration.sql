-- Plan v2 + Live PPV
-- 1) Channel: PPV үнэ + дуусах хугацааны 2 шинэ optional багана
ALTER TABLE "Channel" ADD COLUMN "price" INTEGER;
ALTER TABLE "Channel" ADD COLUMN "endsAt" TIMESTAMP(3);

-- 2) Purchase: vodId nullable болгож channelId нэмнэ (LIVE PPV-д)
ALTER TABLE "Purchase" DROP CONSTRAINT IF EXISTS "Purchase_vodId_fkey";
ALTER TABLE "Purchase" ALTER COLUMN "vodId" DROP NOT NULL;
ALTER TABLE "Purchase" ADD COLUMN "channelId" TEXT;

-- 3) Re-add FK on vodId (nullable allowed)
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_vodId_fkey"
  FOREIGN KEY ("vodId") REFERENCES "VodContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) FK on channelId
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Unique on (userId, channelId) — нэг live event 1 удаа active байна
CREATE UNIQUE INDEX "Purchase_userId_channelId_key" ON "Purchase"("userId", "channelId");
