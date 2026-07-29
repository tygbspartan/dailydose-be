import { Router } from "express";
import { DiscountController } from "../controllers/discount.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { assertOwner } from "../middleware/ownership.middleware";

const router = Router();

// Vendor-scoped ownership guard for mutating :id discount routes.
const owns = assertOwner("discount");

// ==================== CUSTOMER ROUTES ====================

// Validate discount code
router.post("/validate", authenticate, DiscountController.validateCode);

// ==================== ADMIN ROUTES ====================
// isAdmin = vendor OR superadmin; `owns` scopes vendors to their own discounts.

// CRUD operations
router.post("/", authenticate, isAdmin, DiscountController.create);
router.get("/", authenticate, isAdmin, DiscountController.getAll);
router.get("/:id", authenticate, isAdmin, owns, DiscountController.getById);
router.put("/:id", authenticate, isAdmin, owns, DiscountController.update);
router.delete("/:id", authenticate, isAdmin, owns, DiscountController.delete);

export default router;
