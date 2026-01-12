import { Router } from "express";
import { ReviewController } from "../controllers/review.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";

const router = Router();

// ==================== PUBLIC ROUTES ====================

// Get reviews for a product (anyone can view approved reviews)
router.get("/product/:productId", ReviewController.getProductReviews);

// ==================== CUSTOMER ROUTES ====================

// Create review
router.post("/", authenticate, ReviewController.create);

// Get own reviews
router.get("/my-reviews", authenticate, ReviewController.getMyReviews);

// Update own review
router.put("/:id", authenticate, ReviewController.update);

// Delete own review
router.delete("/:id", authenticate, ReviewController.delete);

// Mark review as helpful
router.post("/:id/helpful", authenticate, ReviewController.markHelpful);

// Remove helpful vote
router.delete("/:id/helpful", authenticate, ReviewController.removeHelpful);

// ==================== ADMIN ROUTES ====================

// Get all reviews
router.get("/admin/all", authenticate, isAdmin, ReviewController.getAllReviews);

// Moderate review (approve/reject)
router.patch("/:id/moderate", authenticate, isAdmin, ReviewController.moderate);

// Delete review
router.delete(
  "/admin/:id",
  authenticate,
  isAdmin,
  ReviewController.adminDelete
);

export default router;
