import { Router } from 'express';
import { BrandController } from '../controllers/brand.controller';
import { authenticate, isAdmin } from '../middleware/auth.middleware';

const router = Router();

// Public routes (no authentication required)
router.get('/', BrandController.getAll);
router.get('/featured', BrandController.getFeatured);
router.get('/slug/:slug', BrandController.getBySlug);

// Admin routes (authentication + admin required)
router.post('/', authenticate, isAdmin, BrandController.create);
router.get('/:id', authenticate, isAdmin, BrandController.getById);
router.put('/:id', authenticate, isAdmin, BrandController.update);
router.delete('/:id', authenticate, isAdmin, BrandController.delete);

export default router;