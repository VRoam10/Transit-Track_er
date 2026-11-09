/*
  Warnings:

  - You are about to drop the column `paramKey` on the `Direction` table. All the data in the column will be lost.
  - You are about to drop the column `paramKey` on the `Line` table. All the data in the column will be lost.
  - You are about to drop the column `paramKey` on the `NextPassage` table. All the data in the column will be lost.
  - You are about to drop the column `paramKey` on the `Stop` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Direction" DROP COLUMN "paramKey",
ADD COLUMN     "params" TEXT[];

-- AlterTable
ALTER TABLE "Line" DROP COLUMN "paramKey",
ADD COLUMN     "params" TEXT[];

-- AlterTable
ALTER TABLE "NextPassage" DROP COLUMN "paramKey",
ADD COLUMN     "params" TEXT[];

-- AlterTable
ALTER TABLE "Stop" DROP COLUMN "paramKey",
ADD COLUMN     "params" TEXT[];
