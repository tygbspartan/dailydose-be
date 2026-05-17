import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Parse dates or use defaults (last 30 days)
    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    // 1. Get total counts (not date-filtered)
    const [totalProducts, totalDiscounts, totalBrands] = await Promise.all([
      prisma.product.count({
        where: { isActive: true },
      }),
      prisma.discount.count({
        where: { isActive: true },
      }),
      prisma.brand.count({
        where: { isActive: true },
      }),
    ]);

    // 2. Get orders by status within date range
    const ordersInRange = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        status: true,
        total: true,
      },
    });

    // Count orders by status
    const ordersByStatus = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    let totalRevenue = 0;

    ordersInRange.forEach((order) => {
      // Count by status
      if (ordersByStatus.hasOwnProperty(order.status)) {
        ordersByStatus[order.status as keyof typeof ordersByStatus]++;
      }

      // Calculate total revenue (exclude cancelled orders)
      if (order.status !== "cancelled") {
        totalRevenue += parseFloat(order.total.toString());
      }
    });

    // 3. Total orders in range
    const totalOrders = ordersInRange.length;

    res.status(200).json({
      status: "success",
      message: "Dashboard stats retrieved successfully",
      data: {
        // Top section stats
        totalProducts,
        totalDiscounts,
        totalBrands,

        // Date range stats
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        totalOrders,
        totalRevenue: totalRevenue.toFixed(2),

        // Orders by status
        ordersByStatus,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dashboard stats",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
