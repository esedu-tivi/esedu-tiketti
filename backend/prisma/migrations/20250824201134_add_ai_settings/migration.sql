-- CreateTable
CREATE TABLE "AISettings" (
    "id" TEXT NOT NULL,
    "chatAgentVersion" TEXT NOT NULL DEFAULT 'modern',
    "hintSystemEnabled" BOOLEAN NOT NULL DEFAULT true,
    "hintOnEarlyThreshold" INTEGER NOT NULL DEFAULT 3,
    "hintOnProgressThreshold" INTEGER,
    "hintOnCloseThreshold" INTEGER,
    "hintCooldownTurns" INTEGER NOT NULL DEFAULT 2,
    "hintMaxPerConversation" INTEGER NOT NULL DEFAULT 3,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AISettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AISettings_id_idx" ON "AISettings"("id");
