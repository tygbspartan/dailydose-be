import { Router } from 'express';
import { BrandController } from '../controllers/brand.controller';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import { upload, validateImageBuffer } from '../middleware/upload.middleware';

const router = Router();

// Public routes
router.get('/', BrandController.getAll);
router.get('/featured', BrandController.getFeatured);
router.get('/slug/:slug', BrandController.getBySlug);

// Admin routes
router.post('/', authenticate, isAdmin, BrandController.create);
router.get('/:id', authenticate, isAdmin, BrandController.getById);
router.put('/:id', authenticate, isAdmin, BrandController.update);
router.delete('/:id', authenticate, isAdmin, BrandController.delete);

// Logo upload/delete (multipart/form-data, field name: "logo")
router.post('/:id/logo/upload', authenticate, isAdmin, upload.single('logo'), validateImageBuffer, BrandController.uploadLogo);
router.delete('/:id/logo', authenticate, isAdmin, BrandController.deleteLogo);

export default router;