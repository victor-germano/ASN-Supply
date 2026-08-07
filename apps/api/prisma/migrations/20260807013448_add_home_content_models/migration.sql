-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "imageAlt" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "coverImageAlt" TEXT;
