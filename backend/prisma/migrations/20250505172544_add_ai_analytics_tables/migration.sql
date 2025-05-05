-- CreateTable
CREATE TABLE "AIAssistantInteraction" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "responseTime" DOUBLE PRECISION NOT NULL,
    "rating" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAssistantInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAssistantUsageStat" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalInteractions" INTEGER NOT NULL,
    "avgResponseTime" DOUBLE PRECISION NOT NULL,
    "avgRating" DOUBLE PRECISION,
    "totalTicketsAssisted" INTEGER NOT NULL,

    CONSTRAINT "AIAssistantUsageStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAssistantCategoryStat" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interactionCount" INTEGER NOT NULL,

    CONSTRAINT "AIAssistantCategoryStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIAssistantInteraction_ticketId_idx" ON "AIAssistantInteraction"("ticketId");

-- CreateIndex
CREATE INDEX "AIAssistantInteraction_userId_idx" ON "AIAssistantInteraction"("userId");

-- CreateIndex
CREATE INDEX "AIAssistantInteraction_createdAt_idx" ON "AIAssistantInteraction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIAssistantUsageStat_date_key" ON "AIAssistantUsageStat"("date");

-- CreateIndex
CREATE INDEX "AIAssistantCategoryStat_date_idx" ON "AIAssistantCategoryStat"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AIAssistantCategoryStat_categoryId_date_key" ON "AIAssistantCategoryStat"("categoryId", "date");

-- AddForeignKey
ALTER TABLE "AIAssistantInteraction" ADD CONSTRAINT "AIAssistantInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAssistantInteraction" ADD CONSTRAINT "AIAssistantInteraction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAssistantCategoryStat" ADD CONSTRAINT "AIAssistantCategoryStat_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
