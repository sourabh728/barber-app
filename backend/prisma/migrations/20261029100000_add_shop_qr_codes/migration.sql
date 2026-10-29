-- CreateTable
CREATE TABLE "ShopQrCode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "shopId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopQrCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopQrCode_token_key" ON "ShopQrCode"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ShopQrCode_shopId_key" ON "ShopQrCode"("shopId");

-- CreateIndex
CREATE INDEX "ShopQrCode_createdAt_idx" ON "ShopQrCode"("createdAt");

-- AddForeignKey
ALTER TABLE "ShopQrCode" ADD CONSTRAINT "ShopQrCode_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
