import { Router } from 'express';
import { BrandController } from '../controllers/brand.controller';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import { assertOwner } from '../middleware/ownership.middleware';
import { upload, validateImageBuffer } from '../middleware/upload.middleware';

const router = Router();

// Vendor-scoped ownership guard for mutating :id brand routes.
const owns = assertOwner('brand');

// Public routes
router.get('/', BrandController.getAll);
router.get('/featured', BrandController.getFeatured);
router.get('/slug/:slug', BrandController.getBySlug);

// Admin routes (isAdmin = vendor OR superadmin; `owns` scopes vendors to their own)
router.post('/', authenticate, isAdmin, BrandController.create);
router.get('/:id', authenticate, isAdmin, owns, BrandController.getById);
router.put('/:id', authenticate, isAdmin, owns, BrandController.update);
router.delete('/:id', authenticate, isAdmin, owns, BrandController.delete);

// Logo upload/delete (multipart/form-data, field name: "logo")
router.post('/:id/logo/upload', authenticate, isAdmin, owns, upload.single('logo'), validateImageBuffer, BrandController.uploadLogo);
router.delete('/:id/logo', authenticate, isAdmin, owns, BrandController.deleteLogo);

export default router;