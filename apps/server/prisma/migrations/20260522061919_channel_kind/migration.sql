-- CreateEnum
CREATE TYPE "ChannelKind" AS ENUM ('LIVE', 'TV', 'RADIO');

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "kind" "ChannelKind" NOT NULL DEFAULT 'TV';
