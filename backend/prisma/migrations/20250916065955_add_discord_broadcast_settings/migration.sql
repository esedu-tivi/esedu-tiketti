-- AlterTable
ALTER TABLE "DiscordSettings" ADD COLUMN     "broadcastChannelId" TEXT,
ADD COLUMN     "enableBroadcast" BOOLEAN NOT NULL DEFAULT false;
