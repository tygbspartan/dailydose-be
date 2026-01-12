import { Router } from "express";
import { DiscountController } from "../controllers/discount.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";

const router = Router();

// ==================== CUSTOMER ROUTES ====================

// Validate discount code
router.post("/validate", authenticate, DiscountController.validateCode);

// ==================== ADMIN ROUTES ====================

// CRUD operations
router.post("/", authenticate, isAdmin, DiscountController.create);
router.get("/", authenticate, isAdmin, DiscountController.getAll);
router.get("/:id", authenticate, isAdmin, DiscountController.getById);
router.put("/:id", authenticate, isAdmin, DiscountController.update);
router.delete("/:id", authenticate, isAdmin, DiscountController.delete);

export default router;
