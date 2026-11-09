-- CreateEnum
CREATE TYPE "ResourceKind" AS ENUM ('LINE', 'STOP', 'DIRECTION', 'NEXTPASSAGE');

-- CreateTable
CREATE TABLE "ConnectorResource" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "kind" "ResourceKind" NOT NULL,
    "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "secrets" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectorResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectorResource_connectorId_kind_key" ON "ConnectorResource"("connectorId", "kind");

-- AddForeignKey
ALTER TABLE "ConnectorResource" ADD CONSTRAINT "ConnectorResource_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
