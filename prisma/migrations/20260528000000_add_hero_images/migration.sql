CREATE TABLE "hero_images" (
  "id"            SERIAL PRIMARY KEY,
  "image_url"     TEXT NOT NULL,
  "alt_text"      TEXT,
  "link_url"      TEXT,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_active"     BOOLEAN NOT NULL DEFAULT true,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
