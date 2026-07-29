import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { authenticate, isSuperadmin } from "../middleware/auth.middleware";

const router = Router();

// ==================== SUPERADMIN ROUTES ====================
// Vendor (admin) account management — only the superadmin can create/moderate vendors.

router.post("/vendors", authenticate, isSuperadmin, AdminController.createVendor);
router.get("/vendors", authenticate, isSuperadmin, AdminController.listVendors);
router.get("/vendors/:id", authenticate, isSuperadmin, AdminController.getVendor);
router.patch(
  "/vendors/:id",
  authenticate,
  isSuperadmin,
  AdminController.updateVendor,
);
router.patch(
  "/vendors/:id/status",
  authenticate,
  isSuperadmin,
  AdminController.setVendorStatus,
);
router.put(
  "/vendors/:id/brands",
  authenticate,
  isSuperadmin,
  AdminController.setVendorBrands,
);

export default router;
