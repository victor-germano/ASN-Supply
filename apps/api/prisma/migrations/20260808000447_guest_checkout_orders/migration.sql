/*
  Warnings:

  - Added the required column `colorName` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageUrl` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productName` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productSlug` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestEmail` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestName` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestPhone` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingCity` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingNeighborhood` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingNumber` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingRecipientName` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingState` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingStreet` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingZipCode` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('STANDARD', 'EXPRESS');

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_addressId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "colorName" TEXT NOT NULL,
ADD COLUMN     "imageUrl" TEXT NOT NULL,
ADD COLUMN     "productName" TEXT NOT NULL,
ADD COLUMN     "productSlug" TEXT NOT NULL,
ADD COLUMN     "size" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "guestEmail" TEXT NOT NULL,
ADD COLUMN     "guestName" TEXT NOT NULL,
ADD COLUMN     "guestPhone" TEXT NOT NULL,
ADD COLUMN     "shippingCity" TEXT NOT NULL,
ADD COLUMN     "shippingComplement" TEXT,
ADD COLUMN     "shippingMethod" "ShippingMethod" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "shippingNeighborhood" TEXT NOT NULL,
ADD COLUMN     "shippingNumber" TEXT NOT NULL,
ADD COLUMN     "shippingRecipientName" TEXT NOT NULL,
ADD COLUMN     "shippingState" TEXT NOT NULL,
ADD COLUMN     "shippingStreet" TEXT NOT NULL,
ADD COLUMN     "shippingZipCode" TEXT NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "addressId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "orders_guestEmail_idx" ON "orders"("guestEmail");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
