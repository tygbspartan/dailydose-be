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
        // Check if already in cart
        const existingCartItem = await prisma.cartItem.findUnique({
          where: {
            userId_productId: {
              userId: jwtPayload.userId,
              productId: wishlistItem.productId,
            },
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
