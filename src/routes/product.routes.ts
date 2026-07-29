import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { assertOwner } from "../middleware/ownership.middleware";
import { upload, validateImageBuffer } from "../middleware/upload.middleware";

const router = Router();

// Vendor-scoped ownership guard for all mutating :id product routes.
const owns = assertOwner("product");

// ==================== PUBLIC ROUTES ====================
router.get("/", ProductController.getAll);
router.get("/discounted", ProductController.getDiscountedProducts);
router.get("/slug/:slug", ProductController.getBySlug);
router.get("/:id/images", ProductController.getImages);
router.get("/:id/specifications", ProductController.getSpecifications);

// ==================== ADMIN ROUTES ====================
// isAdmin = vendor OR superadmin; `owns` scopes vendors to their own products.

// Admin/vendor scoped product list (must precede "/:id")
router.get("/admin/all", authenticate, isAdmin, ProductController.getAdminProducts);

// Product CRUD
router.post("/", authenticate, isAdmin, ProductController.create);
router.get("/:id", authenticate, isAdmin, owns, ProductController.getById);
router.put("/:id", authenticate, isAdmin, owns, ProductController.update);
router.delete("/:id", authenticate, isAdmin, owns, ProductController.delete);

// Product Images - Specific routes first!
// Upload a file directly (multipart/form-data, field name: "image")
router.post(
  "/:id/images/upload",
  authenticate,
  isAdmin,
  owns,
  upload.single("image"),
  validateImageBuffer,
  ProductController.uploadImage,
);
// Add images by URL (existing behaviour)
router.post("/:id/images", authenticate, isAdmin, owns, ProductController.addImages);
router.put(
  "/:id/images/reorder",
  authenticate,
  isAdmin,
  owns,
  ProductController.reorderImages,
);
router.patch(
  "/:id/images/:imageId/primary",
  authenticate,
  isAdmin,
  owns,
  ProductController.setPrimaryImage,
);

// Product Images - Generic parameterized routes last
router.put(
  "/:id/images/:imageId",
  authenticate,
  isAdmin,
  owns,
  ProductController.updateImage,
);
router.delete(
  "/:id/images/:imageId",
  authenticate,
  isAdmin,
  owns,
  ProductController.deleteImage,
);

// Product Specifications
router.post(
  "/:id/specifications",
  authenticate,
  isAdmin,
  owns,
  ProductController.addSpecifications,
);
router.put(
  "/:id/specifications/bulk",
  authenticate,
  isAdmin,
  owns,
  ProductController.bulkUpdateSpecifications,
);
router.put(
  "/:id/specifications/:specId",
  authenticate,
  isAdmin,
  owns,
  ProductController.updateSpecification,
);
router.delete(
  "/:id/specifications/:specId",
  authenticate,
  isAdmin,
  owns,
  ProductController.deleteSpecification,
);

export default router;
