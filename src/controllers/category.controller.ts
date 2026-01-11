import { Request, Response, NextFunction } from "express";
import prisma from "../config/database.config";
import { ResponseUtil } from "../utils/response.util";
import { SlugUtil } from "../utils/slug.util";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from "../utils/customError.util";
import {
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../types/product.types";

export class CategoryController {
  // Create category (Admin only)
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        slug,
        description,
        parentId,
        level,
        imageUrl,
        displayOrder,
        metaTitle,
        metaDescription,
      }: CreateCategoryRequest = req.body;

      // Validation
      if (!name) {
        throw new BadRequestError("Category name is required");
      }

      if (!level || (level !== 1 && level !== 2 && level !== 3)) {
        throw new BadRequestError("Level must be 1, 2, or 3");
      }

      // If level 2 or 3, parentId is required
      if (level > 1 && !parentId) {
        throw new BadRequestError(
          `Parent category is required for level ${level}`
        );
      }

      // Validate parent exists if provided
      if (parentId) {
        const parent = await prisma.category.findUnique({
          where: { id: parentId },
        });

        if (!parent) {
          throw new NotFoundError("Parent category not found");
        }

        // Validate parent level is correct
        if (parent.level !== level - 1) {
          throw new BadRequestError(
            `Parent must be level ${level - 1} for level ${level} category`
          );
        }
      }

      // Generate slug if not provided
      let categorySlug = slug || SlugUtil.generateSlug(name);

      // Check if slug already exists
      const existingSlug = await prisma.category.findUnique({
        where: { slug: categorySlug },
      });

      if (existingSlug) {
        throw new ConflictError(
          `Category with slug "${categorySlug}" already exists`
        );
      }

      // Create category
      const category = await prisma.category.create({
        data: {
          name,
          slug: categorySlug,
          description,
          parentId,
          level,
          imageUrl,
          displayOrder: displayOrder || 0,
          metaTitle,
          metaDescription,
        },
        include: {
          parent: true,
        },
      });

      return ResponseUtil.success(
        res,
        category,
        "Category created successfully",
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // Get all categories (Public)
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { level, parentId, isActive } = req.query;

      // Build filter
      const where: any = {};

      if (level) {
        where.level = parseInt(level as string);
      }

      if (parentId) {
        where.parentId = parseInt(parentId as string);
      }

      if (isActive !== undefined) {
        where.isActive = isActive === "true";
      }

      const categories = await prisma.category.findMany({
        where,
        include: {
          parent: true,
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      });

      // Transform response to include counts
      const response = categories.map((category) => ({
        ...category,
        productCount: category._count.products,
        childrenCount: category._count.children,
        _count: undefined, // Remove internal count object
      }));

      return ResponseUtil.success(
        res,
        response,
        "Categories retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Get category tree (hierarchical structure) (Public)
  static async getTree(req: Request, res: Response, next: NextFunction) {
    try {
      // Get all Level 1 categories with their children
      const categories = await prisma.category.findMany({
        where: {
          level: 1,
          isActive: true,
        },
        include: {
          children: {
            where: { isActive: true },
            include: {
              children: {
                where: { isActive: true },
                include: {
                  _count: {
                    select: { products: true },
                  },
                },
              },
              _count: {
                select: { products: true },
              },
            },
            orderBy: { displayOrder: "asc" },
          },
          _count: {
            select: { products: true },
          },
        },
        orderBy: { displayOrder: "asc" },
      });

      return ResponseUtil.success(
        res,
        categories,
        "Category tree retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Get single category by slug (Public)
  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;

      const category = await prisma.category.findUnique({
        where: { slug },
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: { displayOrder: "asc" },
          },
          _count: {
            select: { products: true },
          },
        },
      });

      if (!category) {
        throw new NotFoundError("Category not found");
      }

      return ResponseUtil.success(
        res,
        {
          ...category,
          productCount: category._count.products,
        },
        "Category retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Get single category by ID (Admin)
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id: parseInt(id) },
        include: {
          parent: true,
          children: true,
          _count: {
            select: { products: true },
          },
        },
      });

      if (!category) {
        throw new NotFoundError("Category not found");
      }

      return ResponseUtil.success(
        res,
        category,
        "Category retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Update category (Admin only)
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData: UpdateCategoryRequest = req.body;

      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existingCategory) {
        throw new NotFoundError("Category not found");
      }

      // If updating slug, check for conflicts
      if (updateData.slug && updateData.slug !== existingCategory.slug) {
        const slugExists = await prisma.category.findUnique({
          where: { slug: updateData.slug },
        });

        if (slugExists) {
          throw new ConflictError("Slug already exists");
        }
      }

      // If updating parentId, validate it
      if (updateData.parentId !== undefined) {
        if (updateData.parentId === parseInt(id)) {
          throw new BadRequestError("Category cannot be its own parent");
        }

        if (updateData.parentId !== null) {
          const parent = await prisma.category.findUnique({
            where: { id: updateData.parentId },
          });

          if (!parent) {
            throw new NotFoundError("Parent category not found");
          }
        }
      }

      // Update category
      const category = await prisma.category.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          parent: true,
          children: true,
        },
      });

      return ResponseUtil.success(
        res,
        category,
        "Category updated successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete category (Admin only)
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id: parseInt(id) },
        include: {
          children: true,
          _count: {
            select: { products: true },
          },
        },
      });

      if (!category) {
        throw new NotFoundError("Category not found");
      }

      // Check if category has products
      if (category._count.products > 0) {
        throw new BadRequestError(
          `Cannot delete category with ${category._count.products} products. Remove products first.`
        );
      }

      // Check if category has children
      if (category.children.length > 0) {
        throw new BadRequestError(
          `Cannot delete category with ${category.children.length} subcategories. Remove subcategories first.`
        );
      }

      // Delete category
      await prisma.category.delete({
        where: { id: parseInt(id) },
      });

      return ResponseUtil.success(res, null, "Category deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}
