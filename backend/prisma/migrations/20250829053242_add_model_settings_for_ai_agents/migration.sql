-- AlterTable
ALTER TABLE "AISettings" ADD COLUMN     "chatAgentModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
ADD COLUMN     "summarizerModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
ADD COLUMN     "supportAssistantModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
ADD COLUMN     "ticketGeneratorModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini';
