-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "public"."SavedTimetable" (
    "id" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "timetable" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedTimetable_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."SavedTimetable" ADD CONSTRAINT "SavedTimetable_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
