-- Add reviewType and parentReviewId columns
ALTER TABLE "reviews" ADD COLUMN "review_type" TEXT NOT NULL DEFAULT 'initial';
ALTER TABLE "reviews" ADD COLUMN "parent_review_id" INTEGER;

-- Add unique constraint on parentReviewId (one-to-one self-relation)
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_parent_review_id_key" UNIQUE ("parent_review_id");

-- Add foreign key for parentReviewId
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_parent_review_id_fkey"
  FOREIGN KEY ("parent_review_id") REFERENCES "reviews"("id") ON DELETE SET NULL;

-- Drop old unique constraint (one review per user per product)
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_product_id_user_id_key";

-- Add new unique constraint (1 initial + 1 followup per user per product)
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_user_id_review_type_key"
  UNIQUE ("product_id", "user_id", "review_type");
