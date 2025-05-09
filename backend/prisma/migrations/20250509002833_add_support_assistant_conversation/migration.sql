-- CreateTable
CREATE TABLE "SupportAssistantConversation" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "supportUserId" TEXT NOT NULL,
    "conversationHistory" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportAssistantConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportAssistantConversation_ticketId_idx" ON "SupportAssistantConversation"("ticketId");

-- CreateIndex
CREATE INDEX "SupportAssistantConversation_supportUserId_idx" ON "SupportAssistantConversation"("supportUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportAssistantConversation_ticketId_supportUserId_key" ON "SupportAssistantConversation"("ticketId", "supportUserId");

-- AddForeignKey
ALTER TABLE "SupportAssistantConversation" ADD CONSTRAINT "SupportAssistantConversation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAssistantConversation" ADD CONSTRAINT "SupportAssistantConversation_supportUserId_fkey" FOREIGN KEY ("supportUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
