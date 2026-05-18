/*
  Warnings:

  - You are about to drop the column `country_of_origin` on the `brands` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `meta_description` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `meta_title` on the `categories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "brands" DROP COLUMN "country_of_origin";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "image_url",
DROP COLUMN "meta_description",
DROP COLUMN "meta_title";
