-- CreateTable
CREATE TABLE "DiscordSettings" (
    "id" TEXT NOT NULL,
    "cleanupTTLHours" INTEGER NOT NULL DEFAULT 24,
    "inactiveTTLHours" INTEGER NOT NULL DEFAULT 48,
    "statusRotationMs" INTEGER NOT NULL DEFAULT 10000,
    "showTicketStats" BOOLEAN NOT NULL DEFAULT true,
    "showCleanupTimer" BOOLEAN NOT NULL DEFAULT true,
    "defaultCategoryName" TEXT NOT NULL DEFAULT 'Discord',
    "allowUserClose" BOOLEAN NOT NULL DEFAULT true,
    "enableIntegration" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordSettings_pkey" PRIMARY KEY ("id")
);
