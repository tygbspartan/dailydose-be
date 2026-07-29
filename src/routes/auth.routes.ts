import { Router } from 'express';
import passport from '../config/passport.config';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

// Public routes — throttled to curb brute-force / enumeration.
router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/verify-email', authLimiter, AuthController.verifyEmail);
router.post('/resend-verification', authLimiter, AuthController.resendVerification);
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);
router.post('/reset-password', authLimiter, AuthController.resetPassword);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/api/auth/google/failure' 
  }),
  AuthController.googleCallback
);

// For testing Google auth in Postman
router.get('/google/success', AuthController.googleSuccess);

// Protected routes (require authentication)
router.get('/me', authenticate, AuthController.getCurrentUser);

export default router;