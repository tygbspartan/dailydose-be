import { Router } from "express";
import { HeroController } from "../controllers/hero.controller";
import { authenticate, isSuperadmin } from "../middleware/auth.middleware";
import { upload, validateImageBuffer } from "../middleware/upload.middleware";

const router = Router();

// Public
router.get("/", HeroController.getActive);

// Admin — hero images are global storefront content, superadmin only.
router.get("/all", authenticate, isSuperadmin, HeroController.getAll);
router.post("/upload", authenticate, isSuperadmin, upload.single("image"), validateImageBuffer, HeroController.upload);
router.post("/reorder", authenticate, isSuperadmin, HeroController.reorder);
router.put("/:id", authenticate, isSuperadmin, HeroController.update);
router.delete("/:id", authenticate, isSuperadmin, HeroController.delete);

export default router;
