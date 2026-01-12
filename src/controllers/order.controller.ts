import { Request, Response, NextFunction } from "express";
import prisma from "../config/database.config";
import { ResponseUtil } from "../utils/response.util";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from "../utils/customError.util";
import {
  CheckoutRequest,
  SHIPPING_CONFIG,
  UpdateOrderStatusRequest,
  UpdatePaymentStatusRequest,
  calculateShippingCost,
} from "../types/order.types";
import { JwtPayload } from "../types/auth.types";
import {
  PAYMENT_METHODS,
  requiresTransactionNumber,
} from "../constants/payment.constants";

export class OrderController {
  // Checkout - Create order from cart
  static async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        shippingInfo,
        paymentMethod,
        transactionNumber,
        customerNote,
        discountCode,
      }: CheckoutRequest = req.body;

      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      // Validation - Shipping Info
      if (
        !shippingInfo ||
        !shippingInfo.fullName ||
        !shippingInfo.phone ||
        !shippingInfo.addressLine1 ||
        !shippingInfo.city ||
        !shippingInfo.postalCode
      ) {
        throw new BadRequestError(
          "Full name, phone, address, city, and postal code are required"
        );
      }

      // Validation - Payment Method
      if (!paymentMethod) {
        throw new BadRequestError("Payment method is required");
      }

      const validPaymentMethods = Object.values(PAYMENT_METHODS);
      if (!validPaymentMethods.includes(paymentMethod as any)) {
        throw new BadRequestError(
          `Invalid payment method. Must be one of: ${validPaymentMethods.join(
            ", "
          )}`
        );
      }

      // Validation - Transaction Number (required for online payments)
      if (requiresTransactionNumber(paymentMethod)) {
        if (!transactionNumber || transactionNumber.trim() === "") {
          throw new BadRequestError(
            "Transaction number is required for online payments (eSewa, Khalti, Bank Transfer)"
          );
        }
      }

      // Get user's cart
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
      });

      if (cartItems.length === 0) {
        throw new BadRequestError("Cart is empty. Add items before checkout.");
      }

      // Validate stock availability
      for (const item of cartItems) {
        if (!item.product.isActive) {
          throw new BadRequestError(
            `Product "${item.product.name}" is no longer available`
          );
        }

        if (item.product.stockQuantity < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for "${item.product.name}". Only ${item.product.stockQuantity} available.`
          );
        }
      }

      // Calculate totals
      let subtotal = 0;
      cartItems.forEach((item) => {
        subtotal += Number(item.product.price) * item.quantity;
      });

      // Calculate shipping cost
      let shippingCost = 0;

      if (subtotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) {
        shippingCost = 0;
      } else {
        const city = shippingInfo.city.toLowerCase().trim();
        const valleyCities = [
          "kathmandu",
          "lalitpur",
          "bhaktapur",
          "kirtipur",
          "madhyapur thimi",
          "thimi",
        ];

        const isInsideValley = valleyCities.some(
          (valleyCity) => city.includes(valleyCity) || valleyCity.includes(city)
        );

        shippingCost = isInsideValley
          ? SHIPPING_CONFIG.INSIDE_VALLEY
          : SHIPPING_CONFIG.OUTSIDE_VALLEY;
      }

      // ✅ NEW: Apply discount if code provided
      let discount = 0;
      let discountId: number | null = null;
      let discountCodeUsed: string | null = null;

      if (discountCode) {
        const discountRecord = await prisma.discount.findUnique({
          where: { code: discountCode.toUpperCase() },
        });

        if (discountRecord) {
          const now = new Date();

          // Validate discount
          const isValid =
            discountRecord.isActive &&
            now >= discountRecord.startDate &&
            now <= discountRecord.endDate &&
            (!discountRecord.usageLimit ||
              discountRecord.usedCount < discountRecord.usageLimit) &&
            (!discountRecord.minPurchaseAmount ||
              subtotal >= Number(discountRecord.minPurchaseAmount));

          if (isValid) {
            // Calculate discount
            if (discountRecord.type === "percentage") {
              discount = (subtotal * Number(discountRecord.value)) / 100;
            } else {
              discount = Number(discountRecord.value);
            }

            // Apply max discount cap
            if (
              discountRecord.maxDiscountAmount &&
              discount > Number(discountRecord.maxDiscountAmount)
            ) {
              discount = Number(discountRecord.maxDiscountAmount);
            }

            // Discount cannot exceed subtotal
            if (discount > subtotal) {
              discount = subtotal;
            }

            discountId = discountRecord.id;
            discountCodeUsed = discountRecord.code;
          }
        }
      }

      const tax = 0;
      const total = subtotal + shippingCost + tax - discount;

      // Generate order number
      const orderNumber = await OrderController.generateOrderNumber();

      // Create order with items in transaction
      const order = await prisma.$transaction(async (tx) => {
        // 1. Create order
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId: jwtPayload.userId,
            status: "pending",
            subtotal,
            shippingCost,
            tax,
            discount,
            total,
            shippingFullName: shippingInfo.fullName,
            shippingPhone: shippingInfo.phone,
            shippingAddressLine1: shippingInfo.addressLine1,
            shippingAddressLine2: shippingInfo.addressLine2,
            shippingLandmark: shippingInfo.landmark,
            shippingCity: shippingInfo.city,
            shippingProvince: shippingInfo.province,
            shippingPostalCode: shippingInfo.postalCode,
            shippingCountry: shippingInfo.country || "Nepal",
            paymentMethod,
            paymentStatus: "pending",
            transactionNumber:
              paymentMethod === PAYMENT_METHODS.COD ? null : transactionNumber,
            discountId,
            discountCode: discountCodeUsed,
            customerNote,
          },
        });

        // 2. Create order items and update stock
        for (const item of cartItems) {
          // Create order item (snapshot of product at time of order)
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.product.id,
              productName: item.product.name,
              productSku: item.product.sku,
              productImage: item.product.images[0]?.imageUrl || null,
              price: item.product.price,
              quantity: item.quantity,
              subtotal: Number(item.product.price) * item.quantity,
            },
          });

          // Decrease product stock
          await tx.product.update({
            where: { id: item.product.id },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }

        // 3. Clear user's cart
        await tx.cartItem.deleteMany({
          where: { userId: jwtPayload.userId },
        });

        // 4. Increment discount usage count (if discount was applied)
        if (discountId) {
          await tx.discount.update({
            where: { id: discountId },
            data: {
              usedCount: {
                increment: 1,
              },
            },
          });
        }

        // 5. Return order with items and applied discount
        return await tx.order.findUnique({
          where: { id: newOrder.id },
          include: {
            items: true,
            appliedDiscount: true, // ✅ Include discount details
          },
        });
      });

      return ResponseUtil.success(res, order, "Order placed successfully", 201);

      return ResponseUtil.success(res, order, "Order placed successfully", 201);
    } catch (error) {
      next(error);
    }
  }

  // Get user's orders
  static async getUserOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      const orders = await prisma.order.findMany({
        where: { userId: jwtPayload.userId },
        include: {
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return ResponseUtil.success(res, orders, "Orders retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // Get single order by order number
  static async getOrderByNumber(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { orderNumber } = req.params;
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new NotFoundError("Order not found");
      }

      // Check if order belongs to user
      if (order.userId !== jwtPayload.userId) {
        throw new NotFoundError("Order not found");
      }

      return ResponseUtil.success(res, order, "Order retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  // Get all orders (Admin)
  static async getAllOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, paymentStatus, page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filter
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (paymentStatus) {
        where.paymentStatus = paymentStatus;
      }

      // Get orders with pagination
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            items: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: "desc" },
        }),
        prisma.order.count({ where }),
      ]);

      return ResponseUtil.success(
        res,
        {
          data: orders,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
        "Orders retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Get single order by ID (Admin)
  static async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const orderId = parseInt(id);

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundError("Order not found");
      }

      return ResponseUtil.success(res, order, "Order retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // Update order status (Admin)
  static async updateOrderStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { status, adminNote }: UpdateOrderStatusRequest = req.body;

      const orderId = parseInt(id);

      if (!status) {
        throw new BadRequestError("Status is required");
      }

      const validStatuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];

      if (!validStatuses.includes(status)) {
        throw new BadRequestError(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }

      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
        },
      });

      if (!existingOrder) {
        throw new NotFoundError("Order not found");
      }

      // Check if order is already cancelled
      if (existingOrder.status === "cancelled" && status === "cancelled") {
        throw new BadRequestError("Order is already cancelled");
      }

      // ✅ NEW: If cancelling order, restore stock and discount usage
      if (status === "cancelled" && existingOrder.status !== "cancelled") {
        await prisma.$transaction(async (tx) => {
          // 1. Restore stock for each item
          for (const item of existingOrder.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  increment: item.quantity,
                },
              },
            });
          }

          // 2. Decrement discount usage count (if discount was used)
          if (existingOrder.discountId) {
            await tx.discount.update({
              where: { id: existingOrder.discountId },
              data: {
                usedCount: {
                  decrement: 1,
                },
              },
            });
          }

          // 3. Update order status
          await tx.order.update({
            where: { id: orderId },
            data: {
              status,
              adminNote: adminNote || existingOrder.adminNote,
            },
          });
        });
      } else {
        // Normal status update (not cancelling)
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status,
            adminNote: adminNote || existingOrder.adminNote,
          },
        });
      }

      // Fetch updated order with items
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          appliedDiscount: true,
        },
      });

      return ResponseUtil.success(
        res,
        order,
        "Order status updated successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Update payment status (Admin)
  static async updatePaymentStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { paymentStatus, adminNote }: UpdatePaymentStatusRequest = req.body;

      const orderId = parseInt(id);

      if (!paymentStatus) {
        throw new BadRequestError("Payment status is required");
      }

      const validStatuses = ["pending", "paid", "failed"];

      if (!validStatuses.includes(paymentStatus)) {
        throw new BadRequestError(
          `Invalid payment status. Must be one of: ${validStatuses.join(", ")}`
        );
      }

      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!existingOrder) {
        throw new NotFoundError("Order not found");
      }

      // Update payment status
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus,
          adminNote: adminNote || existingOrder.adminNote,
        },
        include: {
          items: true,
        },
      });

      return ResponseUtil.success(
        res,
        order,
        "Payment status updated successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // ==================== HELPER METHODS ====================

  // Generate unique order number
  private static async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;

    // Get the last order for this year
    const lastOrder = await prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: prefix,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let nextNumber = 1;

    if (lastOrder) {
      // Extract number from last order (e.g., "ORD-2026-005" -> 5)
      const lastNumber = parseInt(lastOrder.orderNumber.split("-")[2]);
      nextNumber = lastNumber + 1;
    }

    // Pad with zeros (e.g., 1 -> 001, 12 -> 012, 123 -> 123)
    const paddedNumber = nextNumber.toString().padStart(3, "0");

    return `${prefix}${paddedNumber}`;
  }
}
