/*
  Warnings:

  - You are about to drop the column `interests` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "interests",
DROP COLUMN "role",
ADD COLUMN     "domains" TEXT[] DEFAULT ARRAY[]::TEXT[];
