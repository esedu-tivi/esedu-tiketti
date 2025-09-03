-- CreateTable
CREATE TABLE "AITokenUsage" (
    "id" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "estimatedCost" DOUBLE PRECISION,
    "ticketId" TEXT,
    "userId" TEXT,
    "requestType" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "responseTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AITokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AITokenUsage_agentType_idx" ON "AITokenUsage"("agentType");

-- CreateIndex
CREATE INDEX "AITokenUsage_createdAt_idx" ON "AITokenUsage"("createdAt");

-- CreateIndex
CREATE INDEX "AITokenUsage_ticketId_idx" ON "AITokenUsage"("ticketId");

-- CreateIndex
CREATE INDEX "AITokenUsage_userId_idx" ON "AITokenUsage"("userId");

-- CreateIndex
CREATE INDEX "AITokenUsage_modelUsed_idx" ON "AITokenUsage"("modelUsed");

-- AddForeignKey
ALTER TABLE "AITokenUsage" ADD CONSTRAINT "AITokenUsage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AITokenUsage" ADD CONSTRAINT "AITokenUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
