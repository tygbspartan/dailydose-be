import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import {
  authenticate,
  optionalAuthenticate,
  isAdmin,
  isSuperadmin,
} from "../middleware/auth.middleware";
import { checkoutLimiter } from "../middleware/rateLimit";

const router = Router();

// ==================== CUSTOMER ROUTES ====================

// Checkout (guest-friendly, rate-limited against order spam)
router.post(
  "/checkout",
  checkoutLimiter,
  optionalAuthenticate,
  OrderController.checkout
);

// Get user's orders (logged-in only — guests have no history)
router.get("/", authenticate, OrderController.getUserOrders);

// Get single order by order number (guest-friendly for confirmation page)
router.get(
  "/:orderNumber",
  optionalAuthenticate,
  OrderController.getOrderByNumber
);

// ==================== ADMIN ROUTES ====================

// Get all orders
router.get("/admin/all", authenticate, isAdmin, OrderController.getAllOrders);

// Get single order by ID
router.get("/admin/:id", authenticate, isAdmin, OrderController.getOrderById);

// Update order status — superadmin only (orders are multi-vendor; one shared status)
router.patch(
  "/admin/:id/status",
  authenticate,
  isSuperadmin,
  OrderController.updateOrderStatus
);

// Update payment status — superadmin only
router.patch(
  "/admin/:id/payment",
  authenticate,
  isSuperadmin,
  OrderController.updatePaymentStatus
);

export default router;
