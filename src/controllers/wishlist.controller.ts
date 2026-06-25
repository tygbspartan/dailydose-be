import { Request, Response, NextFunction } from "express";
import prisma from "../config/database.config";
import { ResponseUtil } from "../utils/response.util";
import { BadRequestError, NotFoundError } from "../utils/customError.util";
import { JwtPayload } from "../types/auth.types";

export class WishlistController {
  // Add item to wishlist
  static async addToWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.body;
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      if (!productId) {
        throw new BadRequestError("Product ID is required");
      }

      // Check if product exists and is active
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product || !product.isActive) {
        throw new NotFoundError("Product not found or unavailable");
      }

      // Check if already in wishlist
      const existingItem = await prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId: jwtPayload.userId,
            productId: productId,
          },
        },
      });

      if (existingItem) {
        throw new BadRequestError("Product already in wishlist");
      }

      // Add to wishlist
      const wishlistItem = await prisma.wishlistItem.create({
        data: {
          userId: jwtPayload.userId,
          productId: productId,
        },
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      });

      return ResponseUtil.success(
        res,
        wishlistItem,
        "Item added to wishlist",
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // Get user's wishlist
  static async getWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      const wishlistItems = await prisma.wishlistItem.findMany({
        where: { userId: jwtPayload.userId },
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Add stock status to products
      const itemsWithStockStatus = wishlistItems.map((item) => {
        let stockStatus: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
        if (item.product.stockQuantity === 0) {
          stockStatus = "out_of_stock";
        } else if (
          item.product.stockQuantity <= item.product.lowStockThreshold
        ) {
          stockStatus = "low_stock";
        }

        return {
          ...item,
          product: {
            ...item.product,
            stockStatus,
          },
        };
      });

      return ResponseUtil.success(
        res,
        itemsWithStockStatus,
        "Wishlist retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Remove item from wishlist
  static async removeFromWishlist(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      const wishlistItemId = parseInt(id);

      // Check if wishlist item exists and belongs to user
      const wishlistItem = await prisma.wishlistItem.findUnique({
        where: { id: wishlistItemId },
      });

      if (!wishlistItem || wishlistItem.userId !== jwtPayload.userId) {
        throw new NotFoundError("Wishlist item not found");
      }

      // Delete wishlist item
      await prisma.wishlistItem.delete({
        where: { id: wishlistItemId },
      });

      return ResponseUtil.success(res, null, "Item removed from wishlist");
    } catch (error) {
      next(error);
    }
  }

  // Bulk move multiple wishlist items to cart
  static async bulkMoveToCart(req: Request, res: Response, next: NextFunction) {
    try {
      const { items } = req.body as {
        items: { wishlistItemId: number; quantity?: number; size?: string }[];
      };
      const jwtPayload = (req as any).jwtPayload as JwtPayload;
      const userId = jwtPayload.userId;

      if (!Array.isArray(items) || items.length === 0) {
        throw new BadRequestError("items array is required and must not be empty");
      }

      // Fetch all referenced wishlist items in one query
      const wishlistItemIds = items.map((i) => i.wishlistItemId);
      const wishlistItems = await prisma.wishlistItem.findMany({
        where: { id: { in: wishlistItemIds }, userId },
        include: { product: true },
      });
      const wishlistMap = new Map(wishlistItems.map((w) => [w.id, w]));

      // Validate each requested item, collect valid ones and failures
      const validItems: { wishlistItem: (typeof wishlistItems)[0]; quantity: number; size: string | null }[] = [];
      const failed: { wishlistItemId: number; reason: string }[] = [];

      for (const reqItem of items) {
        const quantity = reqItem.quantity ?? 1;
        const wishlistItem = wishlistMap.get(reqItem.wishlistItemId);

        if (!wishlistItem) {
          failed.push({ wishlistItemId: reqItem.wishlistItemId, reason: "Wishlist item not found" });
          continue;
        }

        // Validate size against product's available sizes
        const productSizes: string[] | null = wishlistItem.product.sizes
          ? JSON.parse(wishlistItem.product.sizes)
          : null;

        if (productSizes && productSizes.length > 0) {
          if (!reqItem.size) {
            failed.push({
              wishlistItemId: reqItem.wishlistItemId,
              reason: `Size is required. Available: ${productSizes.join(", ")}`,
            });
            continue;
          }
          if (!productSizes.includes(reqItem.size)) {
            failed.push({
              wishlistItemId: reqItem.wishlistItemId,
              reason: `Invalid size "${reqItem.size}". Available: ${productSizes.join(", ")}`,
            });
            continue;
          }
        }

        // Check stock
        if (wishlistItem.product.stockQuantity < quantity) {
          failed.push({
            wishlistItemId: reqItem.wishlistItemId,
            reason: `Insufficient stock (available: ${wishlistItem.product.stockQuantity})`,
          });
          continue;
        }

        validItems.push({ wishlistItem, quantity, size: reqItem.size ?? null });
      }

      if (validItems.length === 0) {
        return ResponseUtil.success(
          res,
          { moved: [], movedCount: 0, failed, failedCount: failed.length },
          "No items could be moved to cart"
        );
      }

      // Process all valid items in a single transaction
      const movedCartItems = await prisma.$transaction(async (tx) => {
        const results = [];

        for (const { wishlistItem, quantity, size } of validItems) {
          const existingCartItem = await tx.cartItem.findFirst({
            where: { userId, productId: wishlistItem.productId, size },
          });

          let cartItem;
          if (existingCartItem) {
            cartItem = await tx.cartItem.update({
              where: { id: existingCartItem.id },
              data: { quantity: existingCartItem.quantity + quantity },
            });
          } else {
            cartItem = await tx.cartItem.create({
              data: { userId, productId: wishlistItem.productId, quantity, size },
            });
          }

          await tx.wishlistItem.delete({ where: { id: wishlistItem.id } });
          results.push(cartItem);
        }

        return results;
      });

      return ResponseUtil.success(
        res,
        {
          moved: movedCartItems,
          movedCount: movedCartItems.length,
          failed,
          failedCount: failed.length,
        },
        `${movedCartItems.length} item(s) moved to cart`
      );
    } catch (error) {
      next(error);
    }
  }

  // Move item from wishlist to cart
  static async moveToCart(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { quantity = 1 } = req.body;
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      const wishlistItemId = parseInt(id);

      // Get wishlist item
      const wishlistItem = await prisma.wishlistItem.findUnique({
        where: { id: wishlistItemId },
        include: { product: true },
      });

      if (!wishlistItem || wishlistItem.userId !== jwtPayload.userId) {
        throw new NotFoundError("Wishlist item not found");
      }

      // Check stock
      if (wishlistItem.product.stockQuantity < quantity) {
        throw new BadRequestError("Product out of stock");
      }

      // Add to cart and remove from wishlist in transaction
      const result = await prisma.$transaction(async (prisma) => {
        // Check if already in cart (no size — wishlist move doesn't select a size)
        const existingCartItem = await prisma.cartItem.findFirst({
          where: {
            userId: jwtPayload.userId,
            productId: wishlistItem.productId,
            size: null,
          },
        });

        let cartItem;
        if (existingCartItem) {
          // Update quantity
          cartItem = await prisma.cartItem.update({
            where: { id: existingCartItem.id },
            data: { quantity: existingCartItem.quantity + quantity },
          });
        } else {
          // Create new cart item
          cartItem = await prisma.cartItem.create({
            data: {
              userId: jwtPayload.userId,
              productId: wishlistItem.productId,
              quantity: quantity,
            },
          });
        }

        // Remove from wishlist
        await prisma.wishlistItem.delete({
          where: { id: wishlistItemId },
        });

        return cartItem;
      });

      return ResponseUtil.success(res, result, "Item moved to cart");
    } catch (error) {
      next(error);
    }
  }

  // Clear entire wishlist
  static async clearWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      await prisma.wishlistItem.deleteMany({
        where: { userId: jwtPayload.userId },
      });

      return ResponseUtil.success(res, null, "Wishlist cleared successfully");
    } catch (error) {
      next(error);
    }
  }
}
