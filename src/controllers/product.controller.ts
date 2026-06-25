import { Request, Response, NextFunction } from "express";
import prisma from "../config/database.config";
import { ResponseUtil } from "../utils/response.util";
import { SlugUtil } from "../utils/slug.util";
import { JsonUtil } from "../utils/json.util";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from "../utils/customError.util";
import {
  CreateProductRequest,
  ProductImageRequest,
  ProductSpecificationRequest,
  UpdateProductRequest,
} from "../types/product.types";
import { StorageService } from "../services/storage.service";
import { CacheService, TTL } from "../services/cache.service";

// Helper function to parse JSON fields
const parseProductArrays = (product: any) => {
  return { ...product };
};

const ALLOWED_SKIN_TYPES = ["Normal", "Dry", "Oily", "Combination", "Sensitive"] as const;

const ALLOWED_SKIN_CONCERNS = [
  "Acne & Breakouts",
  "Oil Control",
  "Large Pores",
  "Dryness",
  "Dehydration",
  "Sensitivity & Redness",
  "Dark Spots & Hyperpigmentation",
  "Uneven Skin Tone",
  "Dullness & Brightening",
  "Uneven Texture",
  "Fine Lines & Wrinkles",
  "Firmness & Elasticity",
  "Dark Circles",
  "Puffiness",
  "Sun Protection",
] as const;

function validateSkinValues(
  values: string[],
  allowed: readonly string[],
  fieldName: string,
): void {
  const invalid = values.filter((v) => !allowed.includes(v as any));
  if (invalid.length > 0) {
    throw new Error(`Invalid ${fieldName} value(s): ${invalid.join(", ")}`);
  }
}

export class ProductController {
  // Create product (Admin)
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        longDescription,
        price,
        originalPrice,
        costPrice,
        stockQuantity,
        lowStockThreshold,
        sku,
        brandId,
        categoryId,
        countryOfOrigin,
        isActive,
        isFeatured,
        homepageFeature,
        sizes,
        skinType,
        skinConcern,
        images,
        specifications,
        metaTitle,
        metaDescription,
      }: CreateProductRequest = req.body;

      // Validation
      if (!name || !price || stockQuantity === undefined || !longDescription || !sku || !brandId || !categoryId) {
        throw new BadRequestError(
          "Name, price, stock quantity, description, SKU, brand, and category are required",
        );
      }

      if (costPrice === undefined || costPrice === null) {
        throw new BadRequestError("Cost price is required");
      }

      if (price <= 0) {
        throw new BadRequestError("Price must be greater than 0");
      }

      if (stockQuantity < 0) {
        throw new BadRequestError("Stock quantity cannot be negative");
      }

      if (skinType?.length) validateSkinValues(skinType, ALLOWED_SKIN_TYPES, "skinType");
      if (skinConcern?.length) validateSkinValues(skinConcern, ALLOWED_SKIN_CONCERNS, "skinConcern");

      // Check if SKU already exists (if provided)
      if (sku) {
        const existingSku = await prisma.product.findUnique({
          where: { sku },
        });

        if (existingSku) {
          throw new ConflictError(`Product with SKU "${sku}" already exists`);
        }
      }

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if slug already exists
      const existingSlug = await prisma.product.findUnique({
        where: { slug },
      });

      if (existingSlug) {
        // Append random number to make it unique
        const uniqueSlug = `${slug}-${Date.now()}`;

        // Create product with images and specifications in a transaction
        const product = await prisma.$transaction(async (tx) => {
          // 1. Create product
          const newProduct = await tx.product.create({
            data: {
              name,
              slug: uniqueSlug,
              longDescription,
              price,
              originalPrice,
              costPrice,
              stockQuantity,
              lowStockThreshold: lowStockThreshold || 10,
              sku,
              brand: brandId ? { connect: { id: brandId } } : undefined,
              category: categoryId ? { connect: { id: categoryId } } : undefined,
              countryOfOrigin,
              metaTitle,
              metaDescription,
              isActive: isActive ?? true,
              isFeatured: isFeatured ?? false,
              homepageFeature: homepageFeature ?? false,
              sizes: sizes?.length ? JSON.stringify(sizes) : null,
              skinType: skinType?.length ? JSON.stringify(skinType) : null,
              skinConcern: skinConcern?.length ? JSON.stringify(skinConcern) : null,
            } as any,
          });

          // 2. Create product images
          if (images && images.length > 0) {
            await Promise.all(
              images.map((image) =>
                tx.productImage.create({
                  data: {
                    productId: newProduct.id,
                    imageUrl: image.imageUrl,
                    altText: image.altText || newProduct.name,
                    isPrimary: image.isPrimary,
                    displayOrder: image.displayOrder,
                  },
                }),
              ),
            );
          }

          // 3. Create specifications
          if (specifications && specifications.length > 0) {
            await Promise.all(
              specifications.map((spec) =>
                tx.productSpecification.create({
                  data: {
                    productId: newProduct.id,
                    key: spec.key,
                    value: spec.value,
                  },
                }),
              ),
            );
          }

          return newProduct;
        });

        // Fetch created product with relations
        const productWithRelations = await prisma.product.findUnique({
          where: { id: product.id },
          include: {
            brand: true,
            category: true,
            images: {
              orderBy: { displayOrder: "asc" },
            },
            specifications: true,
          },
        });

        CacheService.invalidatePatternBackground("products:*");
        return ResponseUtil.success(
          res,
          productWithRelations,
          "Product created successfully",
          201,
        );
      } else {
        // Create product with images and specifications in a transaction
        const product = await prisma.$transaction(async (tx) => {
          // 1. Create product
          const newProduct = await tx.product.create({
            data: {
              name,
              slug,
              longDescription,
              price,
              originalPrice,
              costPrice,
              stockQuantity,
              lowStockThreshold: lowStockThreshold || 10,
              sku,
              brand: brandId ? { connect: { id: brandId } } : undefined,
              category: categoryId ? { connect: { id: categoryId } } : undefined,
              countryOfOrigin,
              isActive: isActive ?? true,
              isFeatured: isFeatured ?? false,
              homepageFeature: homepageFeature ?? false,
              metaDescription,
              metaTitle,
              sizes: sizes?.length ? JSON.stringify(sizes) : null,
              skinType: skinType?.length ? JSON.stringify(skinType) : null,
              skinConcern: skinConcern?.length ? JSON.stringify(skinConcern) : null,
            } as any,
          });

          // 2. Create product images
          if (images && images.length > 0) {
            await Promise.all(
              images.map((image) =>
                tx.productImage.create({
                  data: {
                    productId: newProduct.id,
                    imageUrl: image.imageUrl,
                    altText: image.altText || newProduct.name,
                    isPrimary: image.isPrimary,
                    displayOrder: image.displayOrder,
                  },
                }),
              ),
            );
          }

          // 3. Create specifications
          if (specifications && specifications.length > 0) {
            await Promise.all(
              specifications.map((spec) =>
                tx.productSpecification.create({
                  data: {
                    productId: newProduct.id,
                    key: spec.key,
                    value: spec.value,
                  },
                }),
              ),
            );
          }

          return newProduct;
        });

        // Fetch created product with relations
        const productWithRelations = await prisma.product.findUnique({
          where: { id: product.id },
          include: {
            brand: true,
            category: true,
            images: {
              orderBy: { displayOrder: "asc" },
            },
            specifications: true,
          },
        });

        await CacheService.invalidatePattern("products:*");
        return ResponseUtil.success(
          res,
          parseProductArrays(productWithRelations),
          "Product created successfully",
          201,
        );
      }
    } catch (error) {
      next(error);
    }
  }

  // Update product (Admin)
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData: UpdateProductRequest = req.body;

      const productId = parseInt(id);

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          images: true,
          specifications: true,
        },
      });

      if (!existingProduct) {
        throw new NotFoundError("Product not found");
      }

      // Extract fields from updateData
      const {
        name,
        longDescription,
        price,
        originalPrice,
        costPrice,
        stockQuantity,
        lowStockThreshold,
        sku,
        brandId,
        categoryId,
        countryOfOrigin,
        isActive,
        isFeatured,
        homepageFeature,
        sizes,
        skinType,
        skinConcern,
        images,
        specifications,
        metaTitle,
        metaDescription,
      } = updateData;

      if (skinType?.length) validateSkinValues(skinType, ALLOWED_SKIN_TYPES, "skinType");
      if (skinConcern?.length) validateSkinValues(skinConcern, ALLOWED_SKIN_CONCERNS, "skinConcern");

      // Check if SKU is being changed and if it's already in use
      if (sku && sku !== existingProduct.sku) {
        const existingSku = await prisma.product.findUnique({
          where: { sku },
        });

        if (existingSku) {
          throw new ConflictError(`Product with SKU "${sku}" already exists`);
        }
      }

      // Generate new slug if name is being changed
      let slug = existingProduct.slug;
      if (name && name !== existingProduct.name) {
        slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        // Check if new slug already exists
        const existingSlug = await prisma.product.findFirst({
          where: {
            slug,
            id: { not: productId },
          },
        });

        if (existingSlug) {
          slug = `${slug}-${Date.now()}`;
        }
      }

      // Update product with images and specifications in a transaction
      const product = await prisma.$transaction(async (tx) => {
        // 1. Update product
        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: {
            name,
            slug,
            longDescription,
            price,
            originalPrice,
            costPrice,
            stockQuantity,
            lowStockThreshold,
            sku,
            brand: brandId !== undefined
              ? (brandId ? { connect: { id: brandId } } : { disconnect: true })
              : undefined,
            category: categoryId !== undefined
              ? (categoryId ? { connect: { id: categoryId } } : { disconnect: true })
              : undefined,
            countryOfOrigin,
            isActive,
            isFeatured,
            homepageFeature,
            metaTitle,
            metaDescription,
            sizes: sizes !== undefined ? (sizes?.length ? JSON.stringify(sizes) : null) : undefined,
            skinType: skinType !== undefined ? (skinType?.length ? JSON.stringify(skinType) : null) : undefined,
            skinConcern: skinConcern !== undefined ? (skinConcern?.length ? JSON.stringify(skinConcern) : null) : undefined,
          } as any,
        });

        // 2. Update images if provided
        if (images !== undefined) {
          await tx.productImage.deleteMany({ where: { productId } });

          if (images && images.length > 0) {
            await Promise.all(
              images.map((image) =>
                tx.productImage.create({
                  data: {
                    productId,
                    imageUrl: image.imageUrl,
                    altText: image.altText || updatedProduct.name,
                    isPrimary: image.isPrimary,
                    displayOrder: image.displayOrder,
                  },
                }),
              ),
            );
          }
        }

        // 3. Update specifications if provided
        if (specifications !== undefined) {
          await tx.productSpecification.deleteMany({ where: { productId } });

          if (specifications && specifications.length > 0) {
            await Promise.all(
              specifications.map((spec) =>
                tx.productSpecification.create({
                  data: { productId, key: spec.key, value: spec.value },
                }),
              ),
            );
          }
        }

        return updatedProduct;
      });

      // Delete orphaned Supabase Storage files for images that were removed
      if (images !== undefined) {
        const newUrls = new Set((images || []).map((img) => img.imageUrl));
        const toDelete = existingProduct.images
          .filter((img) => !newUrls.has(img.imageUrl))
          .map((img) => img.imageUrl);

        if (toDelete.length > 0) {
          void StorageService.deleteImages(toDelete).catch((err) =>
            console.error("Failed to delete old product images from storage:", err),
          );
        }
      }

      // Fetch updated product with parallel queries (same pattern as getBySlug)
      const [updatedProduct, allCategories, updatedImages, updatedSpecs] =
        await Promise.all([
          prisma.product.findUnique({ where: { id: product.id }, include: { brand: true } }),
          prisma.category.findMany({
            select: { id: true, name: true, slug: true, parentId: true, level: true, description: true, isActive: true },
          }),
          prisma.productImage.findMany({
            where: { productId: product.id },
            orderBy: { displayOrder: "asc" },
          }),
          prisma.productSpecification.findMany({
            where: { productId: product.id },
          }),
        ]);

      const catMap = new Map(allCategories.map((c) => [c.id, c]));
      const category = ProductController.buildCategoryWithParents(
        updatedProduct!.categoryId,
        catMap,
      );
      const fullProduct = { ...updatedProduct, category, images: updatedImages, specifications: updatedSpecs };
      const response = ProductController.transformProductResponse(fullProduct, true);

      CacheService.invalidatePatternBackground("products:*");
      return ResponseUtil.success(res, response, "Product updated successfully");
    } catch (error) {
      next(error);
    }
  }

  // Helper function to get all category IDs including children
  private static async getCategoryIdsWithChildren(
    categoryId: number,
  ): Promise<number[]> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) return [];

    const categoryIds: number[] = [categoryId];

    if (category.level === 1) {
      // Get all level 2 children
      const level2Categories = await prisma.category.findMany({
        where: { parentId: categoryId, level: 2 },
        select: { id: true },
      });

      const level2Ids = level2Categories.map((cat) => cat.id);
      categoryIds.push(...level2Ids);

      // Get all level 3 children
      if (level2Ids.length > 0) {
        const level3Categories = await prisma.category.findMany({
          where: { parentId: { in: level2Ids }, level: 3 },
          select: { id: true },
        });

        categoryIds.push(...level3Categories.map((cat) => cat.id));
      }
    } else if (category.level === 2) {
      // Get all level 3 children
      const level3Categories = await prisma.category.findMany({
        where: { parentId: categoryId, level: 3 },
        select: { id: true },
      });

      categoryIds.push(...level3Categories.map((cat) => cat.id));
    }

    return categoryIds;
  }

  // Get all products with filters (Public)
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 12,
        search,
        categoryId,
        categorySlug,
        brandId,
        brandSlug,
        minPrice,
        maxPrice,
        inStock,
        isFeatured,
        skinType,
        skinConcern,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const cacheKey = `products:list:${JSON.stringify(req.query)}`;
      const cached = await CacheService.get(cacheKey);
      if (cached) return ResponseUtil.success(res, cached, "Products retrieved successfully");

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        // isActive: true,
      };

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: "insensitive" } },
          { longDescription: { contains: search as string, mode: "insensitive" } },
        ];
      }

      if (categoryId || categorySlug) {
        let targetCategoryId: number | null = null;

        if (categorySlug) {
          const category = await prisma.category.findUnique({
            where: { slug: categorySlug as string },
          });
          targetCategoryId = category?.id || null;
        } else {
          targetCategoryId = parseInt(categoryId as string);
        }

        if (targetCategoryId) {
          const categoryIds =
            await ProductController.getCategoryIdsWithChildren(
              targetCategoryId,
            );

          if (categoryIds.length > 0) {
            where.categoryId =
              categoryIds.length === 1 ? categoryIds[0] : { in: categoryIds };
          }
        }
      }

      // Handle brand filtering (by ID or slug)
      if (brandId || brandSlug) {
        if (brandSlug) {
          const brand = await prisma.brand.findUnique({
            where: { slug: brandSlug as string },
            select: { id: true },
          });
          if (brand) {
            where.brandId = brand.id;
          }
        } else {
          where.brandId = parseInt(brandId as string);
        }
      }

      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice as string);
        if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
      }

      if (inStock === "true") {
        where.stockQuantity = { gt: 0 };
      }

      if (isFeatured === "true") {
        where.isFeatured = true;
      }

      if (req.query.homepageFeature === "true") {
        where.homepageFeature = true;
      }

      // Filter by skin type / skin concern.
      // These are stored as JSON strings in TEXT columns (e.g. ["Oily"]),
      // so we match on the quoted value to avoid partial hits (e.g. "Dry" vs "Dryness").
      // Accepts a single value, comma-separated values, or repeated params;
      // multiple values within a field are OR-ed (product matches any).
      const parseMulti = (val: unknown): string[] =>
        (Array.isArray(val) ? val : typeof val === "string" ? val.split(",") : [])
          .map((v) => String(v).trim())
          .filter(Boolean);

      const skinTypeValues = parseMulti(skinType);
      if (skinTypeValues.length > 0) {
        where.AND = where.AND || [];
        where.AND.push({
          OR: skinTypeValues.map((v) => ({
            skinType: { contains: `"${v}"`, mode: "insensitive" },
          })),
        });
      }

      const skinConcernValues = parseMulti(skinConcern);
      if (skinConcernValues.length > 0) {
        where.AND = where.AND || [];
        where.AND.push({
          OR: skinConcernValues.map((v) => ({
            skinConcern: { contains: `"${v}"`, mode: "insensitive" },
          })),
        });
      }

      // Build orderBy
      const orderBy: any = {};
      orderBy[sortBy as string] = sortOrder;

      // Get products with pagination
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            brand: true,
            category: true,
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
          skip,
          take: limitNum,
          orderBy,
        }),
        prisma.product.count({ where }),
      ]);

      // Transform products
      const transformedProducts = products.map(
        (product) => ProductController.transformProductResponse(product, false), // false = don't include costPrice
      );

      // Parse JSON arrays for each product
      const parsedProducts = transformedProducts.map(parseProductArrays);

      const result = {
        data: parsedProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
      CacheService.setBackground(cacheKey, result, TTL.PRODUCT_LIST);
      return ResponseUtil.success(res, result, "Products retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // Get products with discounts (originalPrice > price)
  static getDiscountedProducts = async (req: Request, res: Response) => {
    try {
      const { limit = 10 } = req.query;

      const cacheKey = `products:discounted:${limit}`;
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        return res.status(200).json({ status: "success", data: { data: cached } });
      }

      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          AND: [
            { originalPrice: { not: null } },
            {
              originalPrice: {
                gt: prisma.product.fields.price,
              },
            },
          ],
        },
        include: {
          brand: true,
          category: true,
          images: {
            orderBy: {
              displayOrder: "asc",
            },
          },
        },
        take: parseInt(limit as string),
        orderBy: {
          createdAt: "desc",
        },
      });

      // Transform products
      const transformedProducts = products.map(
        (product) => ProductController.transformProductResponse(product, false), // false = don't include costPrice
      );

      CacheService.setBackground(cacheKey, transformedProducts, TTL.PRODUCT_LIST);
      res.status(200).json({
        status: "success",
        data: { data: transformedProducts },
        pagination: {
          total: transformedProducts.length,
          page: 1,
          limit: parseInt(limit as string),
        },
      });
    } catch (error) {
      console.error("Get discounted products error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch discounted products",
      });
    }
  };

  // Resolve a category with its parent chain using a pre-fetched category map
  private static buildCategoryWithParents(
    categoryId: number | null,
    catMap: Map<number, any>,
  ): any {
    if (!categoryId) return null;
    const cat = catMap.get(categoryId);
    if (!cat) return null;
    return {
      ...cat,
      parent: cat.parentId ? ProductController.buildCategoryWithParents(cat.parentId, catMap) : null,
    };
  }

  // Get single product by slug (Public)
  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;

      const cacheKey = `products:slug:${slug}`;
      const cached = await CacheService.get(cacheKey);
      if (cached) return ResponseUtil.success(res, cached, "Product retrieved successfully");

      // Run all 4 queries in parallel — cuts 6 sequential RTTs down to 1 parallel group
      const [product, allCategories, images, specifications] = await Promise.all([
        prisma.product.findUnique({ where: { slug }, include: { brand: true } }),
        prisma.category.findMany({
          select: { id: true, name: true, slug: true, parentId: true, level: true, description: true, isActive: true },
        }),
        prisma.productImage.findMany({
          where: { product: { slug } },
          orderBy: { displayOrder: "asc" },
        }),
        prisma.productSpecification.findMany({
          where: { product: { slug } },
        }),
      ]);

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      if (!product.isActive) {
        throw new NotFoundError("Product not available");
      }

      const catMap = new Map(allCategories.map((c) => [c.id, c]));
      const category = ProductController.buildCategoryWithParents(product.categoryId, catMap);

      const fullProduct = { ...product, category, images, specifications };
      const response = ProductController.transformProductResponse(fullProduct, false);

      CacheService.setBackground(cacheKey, response, TTL.PRODUCT_SLUG);
      return ResponseUtil.success(res, response, "Product retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // Get single product by ID (Admin)
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const productId = parseInt(id);

      // Run all 4 queries in parallel
      const [product, allCategories, images, specifications] = await Promise.all([
        prisma.product.findUnique({ where: { id: productId }, include: { brand: true } }),
        prisma.category.findMany({
          select: { id: true, name: true, slug: true, parentId: true, level: true, description: true, isActive: true },
        }),
        prisma.productImage.findMany({
          where: { productId },
          orderBy: { displayOrder: "asc" },
        }),
        prisma.productSpecification.findMany({
          where: { productId },
        }),
      ]);

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      const catMap = new Map(allCategories.map((c) => [c.id, c]));
      const category = ProductController.buildCategoryWithParents(product.categoryId, catMap);

      const fullProduct = { ...product, category, images, specifications };
      const response = ProductController.transformProductResponse(fullProduct, true);

      return ResponseUtil.success(
        res,
        parseProductArrays(response),
        "Product retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // // Update product (Admin only)
  // static async update(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const { id } = req.params;
  //     const updateData: UpdateProductRequest = req.body;

  //     // Check if product exists
  //     const existingProduct = await prisma.product.findUnique({
  //       where: { id: parseInt(id) },
  //     });

  //     if (!existingProduct) {
  //       throw new NotFoundError("Product not found");
  //     }

  //     // If updating slug, check for conflicts
  //     if (updateData.slug && updateData.slug !== existingProduct.slug) {
  //       const slugExists = await prisma.product.findUnique({
  //         where: { slug: updateData.slug },
  //       });

  //       if (slugExists) {
  //         throw new ConflictError("Slug already exists");
  //       }
  //     }

  //     // If updating SKU, check for conflicts
  //     if (updateData.sku && updateData.sku !== existingProduct.sku) {
  //       const skuExists = await prisma.product.findUnique({
  //         where: { sku: updateData.sku },
  //       });

  //       if (skuExists) {
  //         throw new ConflictError("SKU already exists");
  //       }
  //     }

  //     // Validate brand if provided
  //     if (updateData.brandId) {
  //       const brand = await prisma.brand.findUnique({
  //         where: { id: updateData.brandId },
  //       });
  //       if (!brand) {
  //         throw new NotFoundError("Brand not found");
  //       }
  //     }

  //     // Validate category if provided
  //     if (updateData.categoryId) {
  //       const category = await prisma.category.findUnique({
  //         where: { id: updateData.categoryId },
  //       });
  //       if (!category) {
  //         throw new NotFoundError("Category not found");
  //       }
  //     }

  //     // Convert arrays to JSON strings if provided
  //     const dataToUpdate: any = { ...updateData };

  //     if (updateData.effectiveFor !== undefined) {
  //       dataToUpdate.effectiveFor = JsonUtil.arrayToJson(
  //         updateData.effectiveFor
  //       );
  //     }
  //     if (updateData.features !== undefined) {
  //       dataToUpdate.features = JsonUtil.arrayToJson(updateData.features);
  //     }
  //     if (updateData.certifications !== undefined) {
  //       dataToUpdate.certifications = JsonUtil.arrayToJson(
  //         updateData.certifications
  //       );
  //     }
  //     if (updateData.badges !== undefined) {
  //       dataToUpdate.badges = JsonUtil.arrayToJson(updateData.badges);
  //     }

  //     // Update product
  //     const product = await prisma.product.update({
  //       where: { id: parseInt(id) },
  //       data: dataToUpdate,
  //       include: {
  //         brand: true,
  //         category: {
  //           include: {
  //             parent: {
  //               include: {
  //                 parent: true,
  //               },
  //             },
  //           },
  //         },
  //         images: {
  //           orderBy: { displayOrder: "asc" },
  //         },
  //         specifications: true,
  //       },
  //     });

  //     // Transform response
  //     const response = ProductController.transformProductResponse(
  //       product,
  //       true
  //     );

  //     return ResponseUtil.success(
  //       res,
  //       response,
  //       "Product updated successfully"
  //     );
  //   } catch (error) {
  //     next(error);
  //   }
  // }

  // Delete product (Admin only)
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const productId = parseInt(id);

      // Fetch product with images so we can clean up storage
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { images: true },
      });

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      // Delete all images from Supabase Storage before removing DB record
      if (product.images.length > 0) {
        await StorageService.deleteImages(
          product.images.map((img) => img.imageUrl),
        );
      }

      // Delete product — cascade removes ProductImage rows from DB
      await prisma.product.delete({ where: { id: productId } });

      CacheService.invalidatePatternBackground("products:*");
      return ResponseUtil.success(res, null, "Product deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  // Helper method to transform product response
  private static transformProductResponse(
    product: any,
    includeCostPrice: boolean = false,
  ) {
    // Convert JSON strings back to arrays
    const sizes = JsonUtil.jsonToArray(product.sizes);
    const badges = JsonUtil.jsonToArray(product.badges);
    const skinType = JsonUtil.jsonToArray(product.skinType);
    const skinConcern = JsonUtil.jsonToArray(product.skinConcern);

    // Calculate stock status
    let stockStatus: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
    if (product.stockQuantity === 0) {
      stockStatus = "out_of_stock";
    } else if (product.stockQuantity <= product.lowStockThreshold) {
      stockStatus = "low_stock";
    }

    // Calculate discount percentage if originalPrice exists
    let discountPercentage: number | undefined;
    if (product.originalPrice && product.originalPrice > product.price) {
      discountPercentage = Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      );
    }

    const response: any = {
      ...product,
      sizes,
      badges,
      skinType,
      skinConcern,
      stockStatus,
      discountPercentage,
    };

    // Hide costPrice from public
    if (!includeCostPrice) {
      delete response.costPrice;
    }

    return response;
  }

  // ==================== PRODUCT IMAGES ====================

  // Add images to product (Admin only)
  static async addImages(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { images }: { images: ProductImageRequest[] } = req.body;

      // Validation
      if (!images || !Array.isArray(images) || images.length === 0) {
        throw new BadRequestError("Images array is required");
      }

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: parseInt(id) },
      });

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      // Validate image data
      for (const image of images) {
        if (!image.imageUrl) {
          throw new BadRequestError("Image URL is required for all images");
        }
      }

      // If any image is marked as primary, unset existing primary
      const hasPrimary = images.some((img) => img.isPrimary === true);
      if (hasPrimary) {
        await prisma.productImage.updateMany({
          where: { productId: parseInt(id) },
          data: { isPrimary: false },
        });
      }

      // Create images
      const createdImages = await Promise.all(
        images.map((image, index) =>
          prisma.productImage.create({
            data: {
              productId: parseInt(id),
              imageUrl: image.imageUrl,
              altText: image.altText,
              isPrimary: image.isPrimary || false,
              displayOrder: image.displayOrder ?? index + 1,
            },
          }),
        ),
      );

      return ResponseUtil.success(
        res,
        createdImages,
        "Images added successfully",
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  // Get product images (Public)
  static async getImages(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: parseInt(id) },
      });

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      const images = await prisma.productImage.findMany({
        where: { productId: parseInt(id) },
        orderBy: { displayOrder: "asc" },
      });

      return ResponseUtil.success(res, images, "Images retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // Update single image (Admin only)
  static async updateImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, imageId } = req.params;
      const { imageUrl, altText, isPrimary, displayOrder } = req.body;

      // Parse IDs to integers
      const productId = parseInt(id);
      const imageIdInt = parseInt(imageId);

      // Check if image exists
      const existingImage = await prisma.productImage.findUnique({
        where: { id: imageIdInt }, // ✅ Fixed: use parsed integer
      });

      if (!existingImage || existingImage.productId !== productId) {
        throw new NotFoundError("Image not found");
      }

      // If setting as primary, unset other primary images
      if (isPrimary === true) {
        await prisma.productImage.updateMany({
          where: {
            productId: productId,
            id: { not: imageIdInt }, // ✅ Fixed: use parsed integer
          },
          data: { isPrimary: false },
        });
      }

      // Update image
      const image = await prisma.productImage.update({
        where: { id: imageIdInt }, // ✅ Fixed: use parsed integer
        data: {
          imageUrl,
          altText,
          isPrimary,
          displayOrder,
        },
      });

      return ResponseUtil.success(res, image, "Image updated successfully");
    } catch (error) {
      next(error);
    }
  }

  // Delete single image (Admin only)
  static async deleteImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, imageId } = req.params;

      const productId = parseInt(id);
      const imageIdInt = parseInt(imageId);

      const image = await prisma.productImage.findUnique({
        where: { id: imageIdInt },
      });

      if (!image || image.productId !== productId) {
        throw new NotFoundError("Image not found");
      }

      // Delete from Supabase Storage, then remove DB record
      await StorageService.deleteImage(image.imageUrl);
      await prisma.productImage.delete({ where: { id: imageIdInt } });

      return ResponseUtil.success(res, null, "Image deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  // Set primary image (Admin only)
  static async setPrimaryImage(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id, imageId } = req.params;

      // Parse IDs to integers
      const productId = parseInt(id);
      const imageIdInt = parseInt(imageId);

      // Check if image exists and belongs to product
      const image = await prisma.productImage.findUnique({
        where: { id: imageIdInt }, // ✅ Fixed: use parsed integer
      });

      if (!image || image.productId !== productId) {
        throw new NotFoundError("Image not found");
      }

      // Unset all primary images for this product
      await prisma.productImage.updateMany({
        where: { productId: productId },
        data: { isPrimary: false },
      });

      // Set this image as primary
      const updatedImage = await prisma.productImage.update({
        where: { id: imageIdInt }, // ✅ Fixed: use parsed integer
        data: { isPrimary: true },
      });

      return ResponseUtil.success(
        res,
        updatedImage,
        "Primary image updated successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // Upload image file to Supabase Storage and attach to product (Admin only)
  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const productId = parseInt(id);
      const file = req.file;

      if (!file) {
        throw new BadRequestError("Image file is required");
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      // Upload to Supabase Storage
      const imageUrl = await StorageService.uploadImage(file, "products");

      // Check if this product has any images yet (first image becomes primary)
      const existingCount = await prisma.productImage.count({
        where: { productId },
      });

      const image = await prisma.productImage.create({
        data: {
          productId,
          imageUrl,
          altText: product.name,
          isPrimary: existingCount === 0,
          displayOrder: existingCount,
        },
      });

      return ResponseUtil.success(res, image, "Image uploaded successfully", 201);
    } catch (error) {
      next(error);
    }
  }

  // Reorder images (Admin only)
  static async reorderImages(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("here");
      const { id } = req.params;
      const {
        imageOrders,
      }: { imageOrders: { imageId: number; displayOrder: number }[] } =
        req.body;

      // Parse product ID
      const productId = parseInt(id);

      if (!imageOrders || !Array.isArray(imageOrders)) {
        throw new BadRequestError("imageOrders array is required");
      }

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      // Update all image orders
      await Promise.all(
        imageOrders.map(({ imageId, displayOrder }) =>
          prisma.productImage.updateMany({
            where: {
              id: parseInt(imageId.toString()), // ✅ Fixed: ensure integer
              productId: productId,
            },
            data: { displayOrder: parseInt(displayOrder.toString()) }, // ✅ Fixed: ensure integer
          }),
        ),
      );

      // Get updated images
      const images = await prisma.productImage.findMany({
        where: { productId: productId },
        orderBy: { displayOrder: "asc" },
      });

      return ResponseUtil.success(res, images, "Images reordered successfully");
    } catch (error) {
      next(error);
    }
  }

  // ==================== PRODUCT SPECIFICATIONS ====================

  // Add specifications to product (Admin only)
  static async addSpecifications(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const {
        specifications,
      }: { specifications: ProductSpecificationRequest[] } = req.body;

      // Parse product ID
      const productId = parseInt(id);

      // Validation
      if (
        !specifications ||
        !Array.isArray(specifications) ||
        specifications.length === 0
      ) {
        throw new BadRequestError("Specifications array is required");
      }

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      // Validate specification data
      for (const spec of specifications) {
        if (!spec.key || !spec.value) {
          throw new BadRequestError(
            "Key and value are required for all specifications",
          );
        }
      }

      // Create specifications
      const createdSpecs = await Promise.all(
        specifications.map((spec) =>
          prisma.productSpecification.create({
            data: {
              productId: productId,
              key: spec.key,
              value: spec.value,
            },
          }),
        ),
      );

      return ResponseUtil.success(
        res,
        createdSpecs,
        "Specifications added successfully",
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  // Get product specifications (Public)
  static async getSpecifications(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const productId = parseInt(id);

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      const specifications = await prisma.productSpecification.findMany({
        where: { productId: productId },
      });

      return ResponseUtil.success(
        res,
        specifications,
        "Specifications retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // Update single specification (Admin only)
  static async updateSpecification(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id, specId } = req.params;
      const { key, value } = req.body;

      // Parse IDs
      const productId = parseInt(id);
      const specIdInt = parseInt(specId);

      // Check if specification exists
      const existingSpec = await prisma.productSpecification.findUnique({
        where: { id: specIdInt },
      });

      if (!existingSpec || existingSpec.productId !== productId) {
        throw new NotFoundError("Specification not found");
      }

      // Update specification
      const specification = await prisma.productSpecification.update({
        where: { id: specIdInt },
        data: {
          key,
          value,
        },
      });

      return ResponseUtil.success(
        res,
        specification,
        "Specification updated successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete single specification (Admin only)
  static async deleteSpecification(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id, specId } = req.params;

      // Parse IDs
      const productId = parseInt(id);
      const specIdInt = parseInt(specId);

      // Check if specification exists
      const specification = await prisma.productSpecification.findUnique({
        where: { id: specIdInt },
      });

      if (!specification || specification.productId !== productId) {
        throw new NotFoundError("Specification not found");
      }

      // Delete specification
      await prisma.productSpecification.delete({
        where: { id: specIdInt },
      });

      return ResponseUtil.success(
        res,
        null,
        "Specification deleted successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // Bulk update specifications (Admin only)
  static async bulkUpdateSpecifications(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const {
        specifications,
      }: { specifications: ProductSpecificationRequest[] } = req.body;

      // Parse product ID
      const productId = parseInt(id);

      if (!specifications || !Array.isArray(specifications)) {
        throw new BadRequestError("Specifications array is required");
      }

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      // Delete all existing specifications
      await prisma.productSpecification.deleteMany({
        where: { productId: productId },
      });

      // Create new specifications
      const createdSpecs = await Promise.all(
        specifications.map((spec) =>
          prisma.productSpecification.create({
            data: {
              productId: productId,
              key: spec.key,
              value: spec.value,
            },
          }),
        ),
      );

      return ResponseUtil.success(
        res,
        createdSpecs,
        "Specifications updated successfully",
      );
    } catch (error) {
      next(error);
    }
  }
}
