-- CreateTable
CREATE TABLE "look_items" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "priceLabel" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "look_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "look_items_productId_position_idx" ON "look_items"("productId", "position");

-- AddForeignKey
ALTER TABLE "look_items" ADD CONSTRAINT "look_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
