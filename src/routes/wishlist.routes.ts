import { Router } from "express";
import { WishlistController } from "../controllers/wishlist.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// All wishlist routes require authentication
router.post("/", authenticate, WishlistController.addToWishlist);
router.get("/", authenticate, WishlistController.getWishlist);
router.delete("/:id", authenticate, WishlistController.removeFromWishlist);
router.post("/:id/move-to-cart", authenticate, WishlistController.moveToCart);
router.delete("/", authenticate, WishlistController.clearWishlist);

export default router;
