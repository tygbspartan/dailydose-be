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

export class ProductController {
  // Create product (Admin only)
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        slug,
        sku,
        brandId,
        categoryId,
        price,
        originalPrice,
        costPrice,
        shortDescription,
        longDescription,
        volume,
        weight,
        countryOfOrigin,
        effectiveFor,
        features,
        certifications,
        howToUse,
        ingredients,
        cautions,
        stockQuantity,
        lowStockThreshold,
        metaTitle,
        metaDescription,
        isFeatured,
        badges,
        images, // ✅ NEW: Accept images
        specifications, // ✅ NEW: Accept specifications
      }: CreateProductRequest & {
        images?: ProductImageRequest[];
        specifications?: ProductSpecificationRequest[];
      } = req.body;

      // Validation
      if (!name) {
        throw new BadRequestError("Product name is required");
      }

      if (!price || price <= 0) {
        throw new BadRequestError("Valid price is required");
      }

      // Validate brand exists if provided
      if (brandId) {
        const brand = await prisma.brand.findUnique({
          where: { id: brandId },
        });
        if (!brand) {
          throw new NotFoundError("Brand not found");
        }
      }

      // Validate category exists if provided
      if (categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          throw new NotFoundError("Category not found");
        }
      }

      // Generate slug if not provided
      let productSlug = slug || SlugUtil.generateSlug(name);

      // Check if slug already exists
      const existingSlug = await prisma.product.findUnique({
        where: { slug: productSlug },
      });

      if (existingSlug) {
        throw new ConflictError(
          `Product with slug "${productSlug}" already exists`
        );
      }

      // Check if SKU already exists
      if (sku) {
        const existingSku = await prisma.product.findUnique({
          where: { sku },
        });

        if (existingSku) {
          throw new ConflictError(`Product with SKU "${sku}" already exists`);
        }
      }

      // Convert arrays to JSON strings
      const effectiveForJson = JsonUtil.arrayToJson(effectiveFor);
      const featuresJson = JsonUtil.arrayToJson(features);
      const certificationsJson = JsonUtil.arrayToJson(certifications);
      const badgesJson = JsonUtil.arrayToJson(badges);

      // Create product with images and specifications in a transaction
      const product = await prisma.$transaction(async (prisma) => {
        // 1. Create product
        const newProduct = await prisma.product.create({
          data: {
            name,
            slug: productSlug,
            sku,
            brandId,
            categoryId,
            price,
            originalPrice,
            costPrice,
            shortDescription,
            longDescription,
            volume,
            weight,
            countryOfOrigin,
            effectiveFor: effectiveForJson,
            features: featuresJson,
            certifications: certificationsJson,
            howToUse,
            ingredients,
            cautions,
            stockQuantity: stockQuantity || 0,
            lowStockThreshold: lowStockThreshold || 5,
            metaTitle,
            metaDescription,
            isFeatured: isFeatured || false,
            badges: badgesJson,
          },
        });

        // 2. Create images if provided
        if (images && images.length > 0) {
          await Promise.all(
            images.map((image, index) =>
              prisma.productImage.create({
                data: {
                  productId: newProduct.id,
                  imageUrl: image.imageUrl,
                  altText: image.altText,
                  isPrimary: image.isPrimary || false,
                  displayOrder: image.displayOrder ?? index + 1,
                },
              })
            )
          );
        }

        // 3. Create specifications if provided
        if (specifications && specifications.length > 0) {
          await Promise.all(
            specifications.map((spec) =>
              prisma.productSpecification.create({
                data: {
                  productId: newProduct.id,
                  key: spec.key,
                  value: spec.value,
                },
              })
            )
          );
        }

        // 4. Return product with relations
        return await prisma.product.findUnique({
          where: { id: newProduct.id },
          include: {
            brand: true,
            category: {
              include: {
                parent: {
                  include: {
                    parent: true,
                  },
                },
              },
            },
            images: {
              orderBy: { displayOrder: "asc" },
            },
            specifications: true,
          },
        });
      });

      // Transform response
      const response = ProductController.transformProductResponse(product);

      return ResponseUtil.success(
        res,
        response,
        "Product created successfully",
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // Get all products with filters (Public)
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 12,
        search,
        categoryId,
        brandId,
        minPrice,
        maxPrice,
        inStock,
        isFeatured,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        isActive: true,
      };

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: "insensitive" } },
          {
            shortDescription: {
              contains: search as string,
              mode: "insensitive",
            },
          },
        ];
      }

      if (categoryId) {
        where.categoryId = parseInt(categoryId as string);
      }

      if (brandId) {
        where.brandId = parseInt(brandId as string);
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
        (product) => ProductController.transformProductResponse(product, false) // false = don't include costPrice
      );

      return ResponseUtil.success(
        res,
        {
          data: transformedProducts,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
        "Products retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Get single product by slug (Public)
  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;

      const product = await prisma.product.findUnique({
        where: { slug },
        include: {
          brand: true,
          category: {
            include: {
              parent: {
                include: {
                  parent: true,
                },
              },
            },
          },
          images: {
            orderBy: { displayOrder: "asc" },
          },
          specifications: true,
        },
      });

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      if (!product.isActive) {
        throw new NotFoundError("Product not available");
      }

      // Transform response (hide costPrice from public)
      const response = ProductController.transformProductResponse(
        product,
        false
      );

      return ResponseUtil.success(
        res,
        response,
        "Product retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Get single product by ID (Admin)
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id: parseInt(id) },
        include: {
          brand: true,
          category: {
            include: {
              parent: {
                include: {
                  parent: true,
                },
              },
            },
          },
          images: {
            orderBy: { displayOrder: "asc" },
          },
          specifications: true,
        },
      });

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      // Transform response (include costPrice for admin)
      const response = ProductController.transformProductResponse(
        product,
        true
      );

      return ResponseUtil.success(
        res,
        response,
        "Product retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Update product (Admin only)
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData: UpdateProductRequest = req.body;

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existingProduct) {
        throw new NotFoundError("Product not found");
      }

      // If updating slug, check for conflicts
      if (updateData.slug && updateData.slug !== existingProduct.slug) {
        const slugExists = await prisma.product.findUnique({
          where: { slug: updateData.slug },
        });

        if (slugExists) {
          throw new ConflictError("Slug already exists");
        }
      }

      // If updating SKU, check for conflicts
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const skuExists = await prisma.product.findUnique({
          where: { sku: updateData.sku },
        });

        if (skuExists) {
          throw new ConflictError("SKU already exists");
        }
      }

      // Validate brand if provided
      if (updateData.brandId) {
        const brand = await prisma.brand.findUnique({
          where: { id: updateData.brandId },
        });
        if (!brand) {
          throw new NotFoundError("Brand not found");
        }
      }

      // Validate category if provided
      if (updateData.categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: updateData.categoryId },
        });
        if (!category) {
          throw new NotFoundError("Category not found");
        }
      }

      // Convert arrays to JSON strings if provided
      const dataToUpdate: any = { ...updateData };

      if (updateData.effectiveFor !== undefined) {
        dataToUpdate.effectiveFor = JsonUtil.arrayToJson(
          updateData.effectiveFor
        );
      }
      if (updateData.features !== undefined) {
        dataToUpdate.features = JsonUtil.arrayToJson(updateData.features);
      }
      if (updateData.certifications !== undefined) {
        dataToUpdate.certifications = JsonUtil.arrayToJson(
          updateData.certifications
        );
      }
      if (updateData.badges !== undefined) {
        dataToUpdate.badges = JsonUtil.arrayToJson(updateData.badges);
      }

      // Update product
      const product = await prisma.product.update({
        where: { id: parseInt(id) },
        data: dataToUpdate,
        include: {
          brand: true,
          category: {
            include: {
              parent: {
                include: {
                  parent: true,
                },
              },
            },
          },
          images: {
            orderBy: { displayOrder: "asc" },
          },
          specifications: true,
        },
      });

      // Transform response
      const response = ProductController.transformProductResponse(
        product,
        true
      );

      return ResponseUtil.success(
        res,
        response,
        "Product updated successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete product (Admin only)
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: parseInt(id) },
      });

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      // Delete product (cascade will delete images and specifications)
      await prisma.product.delete({
        where: { id: parseInt(id) },
      });

      return ResponseUtil.success(res, null, "Product deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  // Helper method to transform product response
  private static transformProductResponse(
    product: any,
    includeCostPrice: boolean = false
  ) {
    // Convert JSON strings back to arrays
    const effectiveFor = JsonUtil.jsonToArray(product.effectiveFor);
    const features = JsonUtil.jsonToArray(product.features);
    const certifications = JsonUtil.jsonToArray(product.certifications);
    const badges = JsonUtil.jsonToArray(product.badges);

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
        ((product.originalPrice - product.price) / product.originalPrice) * 100
      );
    }

    const response: any = {
      ...product,
      effectiveFor,
      features,
      certifications,
      badges,
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
          })
        )
      );

      return ResponseUtil.success(
        res,
        createdImages,
        "Images added successfully",
        201
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

      // Parse IDs to integers
      const productId = parseInt(id);
      const imageIdInt = parseInt(imageId);

      // Check if image exists
      const image = await prisma.productImage.findUnique({
        where: { id: imageIdInt }, // ✅ Fixed: use parsed integer
      });

      if (!image || image.productId !== productId) {
        throw new NotFoundError("Image not found");
      }

      // Delete image
      await prisma.productImage.delete({
        where: { id: imageIdInt }, // ✅ Fixed: use parsed integer
      });

      return ResponseUtil.success(res, null, "Image deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  // Set primary image (Admin only)
  static async setPrimaryImage(
    req: Request,
    res: Response,
    next: NextFunction
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
        "Primary image updated successfully"
      );
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
          })
        )
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
    next: NextFunction
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
            "Key and value are required for all specifications"
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
          })
        )
      );

      return ResponseUtil.success(
        res,
        createdSpecs,
        "Specifications added successfully",
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // Get product specifications (Public)
  static async getSpecifications(
    req: Request,
    res: Response,
    next: NextFunction
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
        "Specifications retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Update single specification (Admin only)
  static async updateSpecification(
    req: Request,
    res: Response,
    next: NextFunction
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
        "Specification updated successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete single specification (Admin only)
  static async deleteSpecification(
    req: Request,
    res: Response,
    next: NextFunction
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
        "Specification deleted successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Bulk update specifications (Admin only)
  static async bulkUpdateSpecifications(
    req: Request,
    res: Response,
    next: NextFunction
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
          })
        )
      );

      return ResponseUtil.success(
        res,
        createdSpecs,
        "Specifications updated successfully"
      );
    } catch (error) {
      next(error);
    }
  }
}
