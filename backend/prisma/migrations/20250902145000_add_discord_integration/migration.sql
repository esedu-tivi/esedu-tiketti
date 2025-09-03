-- AlterTable - Add Discord integration fields to User
ALTER TABLE "User" ADD COLUMN "isDiscordUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "discordId" TEXT,
ADD COLUMN "discordUsername" TEXT,
ADD COLUMN "discordServerId" TEXT;

-- AlterTable - Add Discord integration fields to Ticket
ALTER TABLE "Ticket" ADD COLUMN "sourceType" TEXT DEFAULT 'WEB',
ADD COLUMN "discordChannelId" TEXT,
ADD COLUMN "discordServerId" TEXT;

-- AlterTable - Add Discord fields to Comment
ALTER TABLE "Comment" ADD COLUMN "discordMessageId" TEXT,
ADD COLUMN "isFromDiscord" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_discordChannelId_key" ON "Ticket"("discordChannelId");