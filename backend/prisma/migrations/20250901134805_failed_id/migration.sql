/*
  Warnings:

  - The primary key for the `SavedTimetable` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "public"."SavedTimetable" DROP CONSTRAINT "SavedTimetable_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "SavedTimetable_pkey" PRIMARY KEY ("id");
