-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "cpuModel" TEXT,
ADD COLUMN     "cpuThreads" INTEGER,
ADD COLUMN     "poolId" TEXT,
ADD COLUMN     "public" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "AgentMetric" ADD COLUMN     "diskIoBytes" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "netIoBytes" BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Pool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agent_poolId_idx" ON "Agent"("poolId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;
