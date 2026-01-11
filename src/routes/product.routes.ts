import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";

const router = Router();

// ==================== PUBLIC ROUTES ====================
router.get("/", ProductController.getAll);
router.get("/slug/:slug", ProductController.getBySlug);
router.get("/:id/images", ProductController.getImages);
router.get("/:id/specifications", ProductController.getSpecifications); // ✅ NEW

// ==================== ADMIN ROUTES ====================

// Product CRUD
router.post("/", authenticate, isAdmin, ProductController.create);
router.get("/:id", authenticate, isAdmin, ProductController.getById);
router.put("/:id", authenticate, isAdmin, ProductController.update);
router.delete("/:id", authenticate, isAdmin, ProductController.delete);

// Product Images - Specific routes first!
router.post("/:id/images", authenticate, isAdmin, ProductController.addImages);
router.put(
  "/:id/images/reorder",
  authenticate,
  isAdmin,
  ProductController.reorderImages
);
router.patch(
  "/:id/images/:imageId/primary",
  authenticate,
  isAdmin,
  ProductController.setPrimaryImage
);

// Product Images - Generic parameterized routes last
router.put(
  "/:id/images/:imageId",
  authenticate,
  isAdmin,
  ProductController.updateImage
);
router.delete(
  "/:id/images/:imageId",
  authenticate,
  isAdmin,
  ProductController.deleteImage
);

// Product Specifications - ✅ NEW
router.post(
  "/:id/specifications",
  authenticate,
  isAdmin,
  ProductController.addSpecifications
);
router.put(
  "/:id/specifications/bulk",
  authenticate,
  isAdmin,
  ProductController.bulkUpdateSpecifications
);
router.put(
  "/:id/specifications/:specId",
  authenticate,
  isAdmin,
  ProductController.updateSpecification
);
router.delete(
  "/:id/specifications/:specId",
  authenticate,
  isAdmin,
  ProductController.deleteSpecification
);

export default router;
