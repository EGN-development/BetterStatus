-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "apiIncidents" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "apiKey" TEXT,
ADD COLUMN     "apiMaintenance" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "apiMetrics" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "apiMonitors" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "apiUptime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicApiEnabled" BOOLEAN NOT NULL DEFAULT false;
