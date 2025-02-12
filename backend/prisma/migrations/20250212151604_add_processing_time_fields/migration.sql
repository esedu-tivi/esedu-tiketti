-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "estimatedCompletionTime" TIMESTAMP(3),
ADD COLUMN     "processingEndedAt" TIMESTAMP(3),
ADD COLUMN     "processingStartedAt" TIMESTAMP(3);
