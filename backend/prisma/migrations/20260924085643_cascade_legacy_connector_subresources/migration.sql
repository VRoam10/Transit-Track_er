-- DropForeignKey
ALTER TABLE "Direction" DROP CONSTRAINT "Direction_connectorId_fkey";

-- DropForeignKey
ALTER TABLE "Line" DROP CONSTRAINT "Line_connectorId_fkey";

-- DropForeignKey
ALTER TABLE "NextPassage" DROP CONSTRAINT "NextPassage_connectorId_fkey";

-- DropForeignKey
ALTER TABLE "Stop" DROP CONSTRAINT "Stop_connectorId_fkey";

-- AddForeignKey
ALTER TABLE "Line" ADD CONSTRAINT "Line_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stop" ADD CONSTRAINT "Stop_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direction" ADD CONSTRAINT "Direction_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NextPassage" ADD CONSTRAINT "NextPassage_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
