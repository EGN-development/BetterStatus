-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "colBg" TEXT,
ADD COLUMN     "colBorder" TEXT,
ADD COLUMN     "colCard" TEXT,
ADD COLUMN     "colDanger" TEXT,
ADD COLUMN     "colForeground" TEXT,
ADD COLUMN     "colMuted" TEXT,
ADD COLUMN     "colMutedFg" TEXT,
ADD COLUMN     "colPrimary" TEXT,
ADD COLUMN     "colSuccess" TEXT,
ADD COLUMN     "colWarning" TEXT,
ADD COLUMN     "faviconUrl" TEXT,
ADD COLUMN     "telegramBotToken" TEXT,
ADD COLUMN     "telegramBotUsername" TEXT,
ADD COLUMN     "useCustomColors" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN     "lang" TEXT NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "notifySubscribers" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MaintenanceMonitors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MaintenanceMonitors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Maintenance_status_scheduledStart_idx" ON "Maintenance"("status", "scheduledStart");

-- CreateIndex
CREATE INDEX "_MaintenanceMonitors_B_index" ON "_MaintenanceMonitors"("B");

-- AddForeignKey
ALTER TABLE "_MaintenanceMonitors" ADD CONSTRAINT "_MaintenanceMonitors_A_fkey" FOREIGN KEY ("A") REFERENCES "Maintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MaintenanceMonitors" ADD CONSTRAINT "_MaintenanceMonitors_B_fkey" FOREIGN KEY ("B") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
