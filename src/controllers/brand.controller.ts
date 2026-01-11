import { Request, Response, NextFunction } from "express";
import prisma from "../config/database.config";
import { ResponseUtil } from "../utils/response.util";
import { SlugUtil } from "../utils/slug.util";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from "../utils/customError.util";
import { CreateBrandRequest, UpdateBrandRequest } from "../types/product.types";

export class BrandController {
  // Create brand (Admin only)
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        slug,
        description,
        logoUrl,
        countryOfOrigin,
        metaTitle,
        metaDescription,
        isFeatured
      }: CreateBrandRequest = req.body;

      // Validation
      if (!name) {
        throw new BadRequestError("Brand name is required");
      }

      // Generate slug if not provided
      let brandSlug = slug || SlugUtil.generateSlug(name);

      // Check if slug already exists
      const existingSlug = await prisma.brand.findUnique({
        where: { slug: brandSlug },
      });

      if (existingSlug) {
        throw new ConflictError(
          `Brand with slug "${brandSlug}" already exists`
        );
      }

      // Create brand
      const brand = await prisma.brand.create({
        data: {
          name,
          slug: brandSlug,
          description,
          logoUrl,
          countryOfOrigin,
          metaTitle,
          metaDescription,
          isFeatured
        },
      });

      return ResponseUtil.success(
        res,
        brand,
        "Brand created successfully",
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // Get all brands (Public)
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive, isFeatured, countryOfOrigin } = req.query;

      // Build filter
      const where: any = {};

      if (isActive !== undefined) {
        where.isActive = isActive === "true";
      }

      if (isFeatured !== undefined) {
        where.isFeatured = isFeatured === "true";
      }

      if (countryOfOrigin) {
        where.countryOfOrigin = countryOfOrigin as string;
      }

      const brands = await prisma.brand.findMany({
        where,
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Transform response to include product count
      const response = brands.map((brand) => ({
        ...brand,
        productCount: brand._count.products,
        _count: undefined, // Remove internal count object
      }));

      return ResponseUtil.success(
        res,
        response,
        "Brands retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Get featured brands (Public)
  static async getFeatured(req: Request, res: Response, next: NextFunction) {
    try {
      const brands = await prisma.brand.findMany({
        where: {
          isFeatured: true,
          isActive: true,
        },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      const response = brands.map((brand) => ({
        ...brand,
        productCount: brand._count.products,
        _count: undefined,
      }));

      return ResponseUtil.success(
        res,
        response,
        "Featured brands retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Get single brand by slug (Public)
  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;

      const brand = await prisma.brand.findUnique({
        where: { slug },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

      if (!brand) {
        throw new NotFoundError("Brand not found");
      }

      return ResponseUtil.success(
        res,
        {
          ...brand,
          productCount: brand._count.products,
        },
        "Brand retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Get single brand by ID (Admin)
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const brand = await prisma.brand.findUnique({
        where: { id: parseInt(id) },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

      if (!brand) {
        throw new NotFoundError("Brand not found");
      }

      return ResponseUtil.success(res, brand, "Brand retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // Update brand (Admin only)
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData: UpdateBrandRequest = req.body;

      // Check if brand exists
      const existingBrand = await prisma.brand.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existingBrand) {
        throw new NotFoundError("Brand not found");
      }

      // If updating slug, check for conflicts
      if (updateData.slug && updateData.slug !== existingBrand.slug) {
        const slugExists = await prisma.brand.findUnique({
          where: { slug: updateData.slug },
        });

        if (slugExists) {
          throw new ConflictError("Slug already exists");
        }
      }

      // Update brand
      const brand = await prisma.brand.update({
        where: { id: parseInt(id) },
        data: updateData,
      });

      return ResponseUtil.success(res, brand, "Brand updated successfully");
    } catch (error) {
      next(error);
    }
  }

  // Delete brand (Admin only)
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if brand exists
      const brand = await prisma.brand.findUnique({
        where: { id: parseInt(id) },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

      if (!brand) {
        throw new NotFoundError("Brand not found");
      }

      // Check if brand has products
      if (brand._count.products > 0) {
        throw new BadRequestError(
          `Cannot delete brand with ${brand._count.products} products. Remove products first.`
        );
      }

      // Delete brand
      await prisma.brand.delete({
        where: { id: parseInt(id) },
      });

      return ResponseUtil.success(res, null, "Brand deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}
