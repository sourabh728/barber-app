-- CreateTable
CREATE TABLE "ShopService" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceInr" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopService_shopId_active_idx" ON "ShopService"("shopId", "active");

-- AddForeignKey
ALTER TABLE "ShopService" ADD CONSTRAINT "ShopService_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
