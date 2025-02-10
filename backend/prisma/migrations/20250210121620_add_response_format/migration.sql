-- CreateEnum
CREATE TYPE "ResponseFormat" AS ENUM ('TEKSTI', 'KUVA', 'VIDEO');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "responseFormat" "ResponseFormat" NOT NULL DEFAULT 'TEKSTI';
