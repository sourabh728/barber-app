-- CreateTable
CREATE TABLE "FavoriteShop" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteShop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavoriteShop_shopId_idx" ON "FavoriteShop"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteShop_userId_shopId_key" ON "FavoriteShop"("userId", "shopId");

-- AddForeignKey
ALTER TABLE "FavoriteShop" ADD CONSTRAINT "FavoriteShop_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteShop" ADD CONSTRAINT "FavoriteShop_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
