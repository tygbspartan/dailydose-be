import { Router } from "express";
import { CategoryController } from "../controllers/category.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";

const router = Router();

// Public routes (no authentication required)
router.get("/", CategoryController.getAll);
router.get("/tree", CategoryController.getTree);
router.get("/slug/:slug", CategoryController.getBySlug);

// Admin routes (authentication + admin required)
router.post("/", authenticate, isAdmin, CategoryController.create);
router.get("/:id", authenticate, isAdmin, CategoryController.getById);
router.put("/:id", authenticate, isAdmin, CategoryController.update);
router.delete("/:id", authenticate, isAdmin, CategoryController.delete);

export default router;
