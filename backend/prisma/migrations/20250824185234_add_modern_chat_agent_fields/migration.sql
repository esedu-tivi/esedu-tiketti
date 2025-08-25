-- DropIndex
DROP INDEX "AIAssistantInteraction_createdAt_userId_idx";

-- DropIndex
DROP INDEX "Notification_userId_read_createdAt_idx";

-- DropIndex
DROP INDEX "Ticket_assignedToId_status_idx";

-- DropIndex
DROP INDEX "Ticket_categoryId_status_idx";

-- DropIndex
DROP INDEX "Ticket_createdAt_idx";

-- DropIndex
DROP INDEX "Ticket_status_priority_idx";

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "emotionalState" TEXT,
ADD COLUMN     "reasoning" TEXT,
ADD COLUMN     "shouldRevealHint" BOOLEAN NOT NULL DEFAULT false;
