/*
  Warnings:

  - You are about to drop the column `connectorID` on the `Direction` table. All the data in the column will be lost.
  - You are about to drop the column `connectorID` on the `Line` table. All the data in the column will be lost.
  - You are about to drop the column `connectorID` on the `NextPassage` table. All the data in the column will be lost.
  - You are about to drop the column `connectorID` on the `Stop` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[connectorId]` on the table `Direction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[connectorId]` on the table `Line` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[connectorId]` on the table `NextPassage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[connectorId]` on the table `Stop` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `connectorId` to the `Direction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `connectorId` to the `Line` table without a default value. This is not possible if the table is not empty.
  - Added the required column `connectorId` to the `NextPassage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `connectorId` to the `Stop` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Direction" DROP CONSTRAINT "Direction_connectorID_fkey";

-- DropForeignKey
ALTER TABLE "public"."Line" DROP CONSTRAINT "Line_connectorID_fkey";

-- DropForeignKey
ALTER TABLE "public"."NextPassage" DROP CONSTRAINT "NextPassage_connectorID_fkey";

-- DropForeignKey
ALTER TABLE "public"."Stop" DROP CONSTRAINT "Stop_connectorID_fkey";

-- DropIndex
DROP INDEX "public"."Direction_connectorID_key";

-- DropIndex
DROP INDEX "public"."Line_connectorID_key";

-- DropIndex
DROP INDEX "public"."NextPassage_connectorID_key";

-- DropIndex
DROP INDEX "public"."Stop_connectorID_key";

-- AlterTable
ALTER TABLE "public"."Direction" DROP COLUMN "connectorID",
ADD COLUMN     "connectorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Line" DROP COLUMN "connectorID",
ADD COLUMN     "connectorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."NextPassage" DROP COLUMN "connectorID",
ADD COLUMN     "connectorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Stop" DROP COLUMN "connectorID",
ADD COLUMN     "connectorId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Direction_connectorId_key" ON "public"."Direction"("connectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Line_connectorId_key" ON "public"."Line"("connectorId");

-- CreateIndex
CREATE UNIQUE INDEX "NextPassage_connectorId_key" ON "public"."NextPassage"("connectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Stop_connectorId_key" ON "public"."Stop"("connectorId");

-- AddForeignKey
ALTER TABLE "public"."Line" ADD CONSTRAINT "Line_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "public"."Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Stop" ADD CONSTRAINT "Stop_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "public"."Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Direction" ADD CONSTRAINT "Direction_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "public"."Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NextPassage" ADD CONSTRAINT "NextPassage_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "public"."Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
