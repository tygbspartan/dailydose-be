import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { upload, validateImageBuffer } from "../middleware/upload.middleware";

const router = Router();

// ==================== PUBLIC ROUTES ====================
router.get("/", ProductController.getAll);
router.get("/discounted", ProductController.getDiscountedProducts);
router.get("/slug/:slug", ProductController.getBySlug);
router.get("/:id/images", ProductController.getImages);
router.get("/:id/specifications", ProductController.getSpecifications);

// ==================== ADMIN ROUTES ====================

// Product CRUD
router.post("/", authenticate, isAdmin, ProductController.create);
router.get("/:id", authenticate, isAdmin, ProductController.getById);
router.put("/:id", authenticate, isAdmin, ProductController.update);
router.delete("/:id", authenticate, isAdmin, ProductController.delete);

// Product Images - Specific routes first!
// Upload a file directly (multipart/form-data, field name: "image")
router.post(
  "/:id/images/upload",
  authenticate,
  isAdmin,
  upload.single("image"),
  validateImageBuffer,
  ProductController.uploadImage,
);
// Add images by URL (existing behaviour)
router.post("/:id/images", authenticate, isAdmin, ProductController.addImages);
router.put(
  "/:id/images/reorder",
  authenticate,
  isAdmin,
  ProductController.reorderImages,
);
router.patch(
  "/:id/images/:imageId/primary",
  authenticate,
  isAdmin,
  ProductController.setPrimaryImage,
);

// Product Images - Generic parameterized routes last
router.put(
  "/:id/images/:imageId",
  authenticate,
  isAdmin,
  ProductController.updateImage,
);
router.delete(
  "/:id/images/:imageId",
  authenticate,
  isAdmin,
  ProductController.deleteImage,
);

// Product Specifications - ✅ NEW
router.post(
  "/:id/specifications",
  authenticate,
  isAdmin,
  ProductController.addSpecifications,
);
router.put(
  "/:id/specifications/bulk",
  authenticate,
  isAdmin,
  ProductController.bulkUpdateSpecifications,
);
router.put(
  "/:id/specifications/:specId",
  authenticate,
  isAdmin,
  ProductController.updateSpecification,
);
router.delete(
  "/:id/specifications/:specId",
  authenticate,
  isAdmin,
  ProductController.deleteSpecification,
);

export default router;
