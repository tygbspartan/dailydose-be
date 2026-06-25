import { Router } from "express";
import { HeroController } from "../controllers/hero.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { upload, validateImageBuffer } from "../middleware/upload.middleware";

const router = Router();

// Public
router.get("/", HeroController.getActive);

// Admin
router.get("/all", authenticate, isAdmin, HeroController.getAll);
router.post("/upload", authenticate, isAdmin, upload.single("image"), validateImageBuffer, HeroController.upload);
router.post("/reorder", authenticate, isAdmin, HeroController.reorder);
router.put("/:id", authenticate, isAdmin, HeroController.update);
router.delete("/:id", authenticate, isAdmin, HeroController.delete);

export default router;
