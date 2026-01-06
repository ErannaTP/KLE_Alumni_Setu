/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `FriendRequest` table. All the data in the column will be lost.
  - The `role` column on the `Student` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[userId,userType,friendId,friendType]` on the table `Connection` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `friendType` to the `Connection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userType` to the `Connection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverType` to the `FriendRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderType` to the `FriendRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Connection" DROP CONSTRAINT "Connection_friendId_fkey";

-- DropForeignKey
ALTER TABLE "Connection" DROP CONSTRAINT "Connection_userId_fkey";

-- DropForeignKey
ALTER TABLE "FriendRequest" DROP CONSTRAINT "FriendRequest_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "FriendRequest" DROP CONSTRAINT "FriendRequest_senderId_fkey";

-- DropIndex
DROP INDEX "Connection_friendId_idx";

-- DropIndex
DROP INDEX "Connection_userId_friendId_key";

-- DropIndex
DROP INDEX "FriendRequest_receiverId_idx";

-- DropIndex
DROP INDEX "FriendRequest_senderId_idx";

-- DropIndex
DROP INDEX "FriendRequest_senderId_receiverId_key";

-- AlterTable
ALTER TABLE "Connection" ADD COLUMN     "friendType" "UserRole" NOT NULL,
ADD COLUMN     "userType" "UserRole" NOT NULL;

-- AlterTable
ALTER TABLE "FriendRequest" DROP COLUMN "updatedAt",
ADD COLUMN     "receiverType" "UserRole" NOT NULL,
ADD COLUMN     "senderType" "UserRole" NOT NULL;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'STUDENT';

-- CreateIndex
CREATE UNIQUE INDEX "Connection_userId_userType_friendId_friendType_key" ON "Connection"("userId", "userType", "friendId", "friendType");
