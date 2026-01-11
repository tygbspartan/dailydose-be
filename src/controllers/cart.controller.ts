import { Request, Response, NextFunction } from "express";
import prisma from "../config/database.config";
import { ResponseUtil } from "../utils/response.util";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from "../utils/customError.util";
import { AddToCartRequest, UpdateCartItemRequest } from "../types/cart.types";
import { JwtPayload } from "../types/auth.types";

export class CartController {
  // Add item to cart
  static async addToCart(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, quantity = 1 }: AddToCartRequest = req.body;
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      // Validation
      if (!productId) {
        throw new BadRequestError("Product ID is required");
      }

      if (quantity < 1) {
        throw new BadRequestError("Quantity must be at least 1");
      }

      // Check if product exists and is active
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product || !product.isActive) {
        throw new NotFoundError("Product not found or unavailable");
      }

      // Check if product is in stock
      if (product.stockQuantity < quantity) {
        throw new BadRequestError(
          `Only ${product.stockQuantity} units available in stock`
        );
      }

      // Check if item already in cart
      const existingCartItem = await prisma.cartItem.findUnique({
        where: {
          userId_productId: {
            userId: jwtPayload.userId,
            productId: productId,
          },
        },
      });

      let cartItem;

      if (existingCartItem) {
        // Update quantity
        const newQuantity = existingCartItem.quantity + quantity;

        if (product.stockQuantity < newQuantity) {
          throw new BadRequestError(
            `Cannot add more. Only ${product.stockQuantity} units available`
          );
        }

        cartItem = await prisma.cartItem.update({
          where: { id: existingCartItem.id },
          data: { quantity: newQuantity },
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
      } else {
        // Create new cart item
        cartItem = await prisma.cartItem.create({
          data: {
            userId: jwtPayload.userId,
            productId: productId,
            quantity: quantity,
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
      }

      return ResponseUtil.success(
        res,
        cartItem,
        "Item added to cart successfully",
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // Get user's cart
  static async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      const cartItems = await prisma.cartItem.findMany({
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

      // Calculate totals
      let subtotal = 0;
      let totalItems = 0;

      const itemsWithStockStatus = cartItems.map((item) => {
        const itemTotal = Number(item.product.price) * item.quantity;
        subtotal += itemTotal;
        totalItems += item.quantity;

        // Calculate stock status
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

      const cartSummary = {
        items: itemsWithStockStatus,
        summary: {
          totalItems,
          subtotal,
          estimatedTotal: subtotal, // Will add shipping/tax later
        },
      };

      return ResponseUtil.success(
        res,
        cartSummary,
        "Cart retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Update cart item quantity
  static async updateCartItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { quantity }: UpdateCartItemRequest = req.body;
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      const cartItemId = parseInt(id);

      if (!quantity || quantity < 1) {
        throw new BadRequestError("Valid quantity is required");
      }

      // Check if cart item exists and belongs to user
      const cartItem = await prisma.cartItem.findUnique({
        where: { id: cartItemId },
        include: { product: true },
      });

      if (!cartItem || cartItem.userId !== jwtPayload.userId) {
        throw new NotFoundError("Cart item not found");
      }

      // Check stock availability
      if (cartItem.product.stockQuantity < quantity) {
        throw new BadRequestError(
          `Only ${cartItem.product.stockQuantity} units available in stock`
        );
      }

      // Update quantity
      const updatedCartItem = await prisma.cartItem.update({
        where: { id: cartItemId },
        data: { quantity },
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
        updatedCartItem,
        "Cart item updated successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Remove item from cart
  static async removeFromCart(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      const cartItemId = parseInt(id);

      // Check if cart item exists and belongs to user
      const cartItem = await prisma.cartItem.findUnique({
        where: { id: cartItemId },
      });

      if (!cartItem || cartItem.userId !== jwtPayload.userId) {
        throw new NotFoundError("Cart item not found");
      }

      // Delete cart item
      await prisma.cartItem.delete({
        where: { id: cartItemId },
      });

      return ResponseUtil.success(res, null, "Item removed from cart");
    } catch (error) {
      next(error);
    }
  }

  // Clear entire cart
  static async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      await prisma.cartItem.deleteMany({
        where: { userId: jwtPayload.userId },
      });

      return ResponseUtil.success(res, null, "Cart cleared successfully");
    } catch (error) {
      next(error);
    }
  }
}
