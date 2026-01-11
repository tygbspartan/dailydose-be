import { Router } from "express";
import { CartController } from "../controllers/cart.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// All cart routes require authentication
router.post("/", authenticate, CartController.addToCart);
router.get("/", authenticate, CartController.getCart);
router.put("/:id", authenticate, CartController.updateCartItem);
router.delete("/:id", authenticate, CartController.removeFromCart);
router.delete("/", authenticate, CartController.clearCart);

export default router;
