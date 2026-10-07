-- AlterEnum
ALTER TYPE "StaffStatus" ADD VALUE 'AWAY';

-- AlterTable
ALTER TABLE "ShopStaff" ADD COLUMN "awayUntil" TIMESTAMP(3);
