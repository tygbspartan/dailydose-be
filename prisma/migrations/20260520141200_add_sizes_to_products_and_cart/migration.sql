-- DropIndex
DROP INDEX "cart_items_user_id_product_id_key";

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "size" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "product_size" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "sizes" TEXT;
