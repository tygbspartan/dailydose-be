-- Remove deprecated product fields
ALTER TABLE "products" DROP COLUMN IF EXISTS "short_description";
ALTER TABLE "products" DROP COLUMN IF EXISTS "volume";
ALTER TABLE "products" DROP COLUMN IF EXISTS "weight";
ALTER TABLE "products" DROP COLUMN IF EXISTS "effective_for";
ALTER TABLE "products" DROP COLUMN IF EXISTS "features";
ALTER TABLE "products" DROP COLUMN IF EXISTS "certifications";
ALTER TABLE "products" DROP COLUMN IF EXISTS "how_to_use";
ALTER TABLE "products" DROP COLUMN IF EXISTS "ingredients";
ALTER TABLE "products" DROP COLUMN IF EXISTS "cautions";
