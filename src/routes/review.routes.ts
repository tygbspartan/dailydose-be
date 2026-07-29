import { Router } from "express";
import { ReviewController } from "../controllers/review.controller";
import { authenticate, isSuperadmin } from "../middleware/auth.middleware";

const router = Router();

// ==================== PUBLIC ROUTES ====================

// Get reviews for a product (anyone can view approved reviews)
router.get("/product/:productId", ReviewController.getProductReviews);

// ==================== CUSTOMER ROUTES ====================

// Create review
router.post("/", authenticate, ReviewController.create);

// Add follow-up to an existing initial review (30-day gap enforced, needs admin approval)
router.post("/:id/followup", authenticate, ReviewController.createFollowup);

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
// Review moderation is a platform responsibility — superadmin only.

// Get all reviews
router.get("/admin/all", authenticate, isSuperadmin, ReviewController.getAllReviews);

// Moderate review (approve/reject)
router.patch("/:id/moderate", authenticate, isSuperadmin, ReviewController.moderate);

// Delete review
router.delete(
  "/admin/:id",
  authenticate,
  isSuperadmin,
  ReviewController.adminDelete
);

export default router;
