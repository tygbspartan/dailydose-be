import { Router } from 'express';
import { BrandController } from '../controllers/brand.controller';
import { authenticate, isAdmin, isSuperadmin } from '../middleware/auth.middleware';
import { assertOwner } from '../middleware/ownership.middleware';
import { upload, validateImageBuffer } from '../middleware/upload.middleware';

const router = Router();

// Vendor-scoped ownership guard for :id brand view routes.
const owns = assertOwner('brand');

// Public routes
router.get('/', BrandController.getAll);
router.get('/featured', BrandController.getFeatured);
router.get('/slug/:slug', BrandController.getBySlug);

// Scoped list — vendors see their own brands (view), superadmin sees all.
// Must precede "/:id".
router.get('/admin/list', authenticate, isAdmin, BrandController.getAdminBrands);

// View a single brand — vendor may view their own (owns), superadmin any.
router.get('/:id', authenticate, isAdmin, owns, BrandController.getById);

// Brand management is superadmin-only. Vendors receive brands via assignment
// (at vendor creation or the vendor page) and cannot create/edit/delete them.
router.post('/', authenticate, isSuperadmin, BrandController.create);
router.put('/:id', authenticate, isSuperadmin, BrandController.update);
router.delete('/:id', authenticate, isSuperadmin, BrandController.delete);

// Logo upload/delete (multipart/form-data, field name: "logo") — superadmin only.
router.post('/:id/logo/upload', authenticate, isSuperadmin, upload.single('logo'), validateImageBuffer, BrandController.uploadLogo);
router.delete('/:id/logo', authenticate, isSuperadmin, BrandController.deleteLogo);

export default router;