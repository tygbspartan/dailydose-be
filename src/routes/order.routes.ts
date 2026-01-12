import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";

const router = Router();

// ==================== CUSTOMER ROUTES ====================

// Checkout
router.post("/checkout", authenticate, OrderController.checkout);

// Get user's orders
router.get("/", authenticate, OrderController.getUserOrders);

// Get single order by order number
router.get("/:orderNumber", authenticate, OrderController.getOrderByNumber);

// ==================== ADMIN ROUTES ====================

// Get all orders
router.get("/admin/all", authenticate, isAdmin, OrderController.getAllOrders);

// Get single order by ID
router.get("/admin/:id", authenticate, isAdmin, OrderController.getOrderById);

// Update order status
router.patch(
  "/admin/:id/status",
  authenticate,
  isAdmin,
  OrderController.updateOrderStatus
);

// Update payment status
router.patch(
  "/admin/:id/payment",
  authenticate,
  isAdmin,
  OrderController.updatePaymentStatus
);

export default router;
