CREATE UNIQUE INDEX IF NOT EXISTS "reviews_product_id_user_id_review_type_key"
  ON "reviews"("product_id", "user_id", "review_type");
