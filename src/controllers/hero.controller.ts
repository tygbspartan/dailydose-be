import { Request, Response, NextFunction } from "express";
import prismaClient from "../config/database.config";

const prisma = prismaClient as any;
import { ResponseUtil } from "../utils/response.util";
import { BadRequestError, NotFoundError } from "../utils/customError.util";
import { StorageService } from "../services/storage.service";

export class HeroController {
  // GET /hero — public, active images ordered by displayOrder
  static async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const images = await prisma.heroImage.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      });
      return ResponseUtil.success(res, images, "Hero images retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // GET /hero/all — admin, all images regardless of isActive
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const images = await prisma.heroImage.findMany({
        orderBy: { displayOrder: "asc" },
      });
      return ResponseUtil.success(res, images, "Hero images retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // POST /hero/upload — admin, upload image file from PC
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) throw new BadRequestError("Image file is required");

      const { altText, linkUrl, displayOrder } = req.body;

      const imageUrl = await StorageService.uploadImage(file, "hero");

      // Default displayOrder to end of list
      const lastImage = await prisma.heroImage.findFirst({
        orderBy: { displayOrder: "desc" },
      });
      const nextOrder =
        displayOrder !== undefined
          ? parseInt(displayOrder)
          : (lastImage?.displayOrder ?? -1) + 1;

      const image = await prisma.heroImage.create({
        data: {
          imageUrl,
          altText: altText || null,
          linkUrl: linkUrl || null,
          displayOrder: nextOrder,
          isActive: true,
        },
      });

      return ResponseUtil.success(res, image, "Hero image uploaded successfully", 201);
    } catch (error) {
      next(error);
    }
  }

  // PUT /hero/:id — admin, update metadata
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { altText, linkUrl, displayOrder, isActive } = req.body;

      const existing = await prisma.heroImage.findUnique({
        where: { id: parseInt(id) },
      });
      if (!existing) throw new NotFoundError("Hero image not found");

      const image = await prisma.heroImage.update({
        where: { id: parseInt(id) },
        data: {
          altText: altText !== undefined ? altText : existing.altText,
          linkUrl: linkUrl !== undefined ? linkUrl : existing.linkUrl,
          displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : existing.displayOrder,
          isActive: isActive !== undefined ? isActive : existing.isActive,
        },
      });

      return ResponseUtil.success(res, image, "Hero image updated successfully");
    } catch (error) {
      next(error);
    }
  }

  // DELETE /hero/:id — admin, delete from DB + storage
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const image = await prisma.heroImage.findUnique({
        where: { id: parseInt(id) },
      });
      if (!image) throw new NotFoundError("Hero image not found");

      await Promise.all([
        StorageService.deleteImage(image.imageUrl),
        prisma.heroImage.delete({ where: { id: parseInt(id) } }),
      ]);

      return ResponseUtil.success(res, null, "Hero image deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  // POST /hero/reorder — admin, bulk update display orders
  static async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const { order }: { order: { id: number; displayOrder: number }[] } = req.body;

      if (!Array.isArray(order) || order.length === 0) {
        throw new BadRequestError("order array is required");
      }

      await Promise.all(
        order.map(({ id, displayOrder }) =>
          prisma.heroImage.update({
            where: { id },
            data: { displayOrder },
          })
        )
      );

      const images = await prisma.heroImage.findMany({
        orderBy: { displayOrder: "asc" },
      });

      return ResponseUtil.success(res, images, "Hero images reordered successfully");
    } catch (error) {
      next(error);
    }
  }
}
