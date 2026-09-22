-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "closeTime" TEXT NOT NULL DEFAULT '20:00',
ADD COLUMN     "lunchEnd" TEXT NOT NULL DEFAULT '14:00',
ADD COLUMN     "lunchStart" TEXT NOT NULL DEFAULT '13:00',
ADD COLUMN     "openTime" TEXT NOT NULL DEFAULT '09:00';

-- CreateTable
CREATE TABLE "ShopHoliday" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopHoliday_shopId_idx" ON "ShopHoliday"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopHoliday_shopId_date_key" ON "ShopHoliday"("shopId", "date");

-- AddForeignKey
ALTER TABLE "ShopHoliday" ADD CONSTRAINT "ShopHoliday_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
