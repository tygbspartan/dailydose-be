import { Router } from "express";
import { CategoryController } from "../controllers/category.controller";
import { authenticate, isSuperadmin } from "../middleware/auth.middleware";

const router = Router();

// Public routes (no authentication required)
router.get("/", CategoryController.getAll);
router.get("/tree", CategoryController.getTree);
router.get("/slug/:slug", CategoryController.getBySlug);

// Admin routes — categories are the global taxonomy, superadmin only.
router.post("/", authenticate, isSuperadmin, CategoryController.create);
router.get("/:id", authenticate, isSuperadmin, CategoryController.getById);
router.put("/:id", authenticate, isSuperadmin, CategoryController.update);
router.delete("/:id", authenticate, isSuperadmin, CategoryController.delete);

export default router;
