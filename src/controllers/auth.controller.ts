import { Request, Response, NextFunction } from "express";
import prisma from "../config/database.config";
import { AuthService } from "../services/auth.service";
import { EmailService } from "../services/email.service";
import { ResponseUtil } from "../utils/response.util";
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from "../utils/customError.util";
import {
  RegisterRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  JwtPayload,
} from "../types/auth.types";
import { config } from "../config/env.config";

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, phone }: RegisterRequest =
        req.body;

      // Validation
      if (!email || !password) {
        throw new BadRequestError("Email and password are required");
      }

      if (!AuthService.validateEmail(email)) {
        throw new BadRequestError("Invalid email format");
      }

      const passwordValidation = AuthService.validatePassword(password);
      if (!passwordValidation.valid) {
        throw new BadRequestError(
          passwordValidation.message || "Invalid password"
        );
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new ConflictError("User with this email already exists");
      }

      // Hash password
      const passwordHash = await AuthService.hashPassword(password);

      // Generate email verification token
      const emailVerificationToken =
        AuthService.generateEmailVerificationToken();

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          phone,
          emailVerificationToken,
          isEmailVerified: false,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isEmailVerified: true,
          createdAt: true,
        },
      });

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(
          user.email,
          emailVerificationToken
        );
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Don't throw error - user is created, just email failed
      }

      // Generate JWT token (user can login but can't order until verified)
      const token = AuthService.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return ResponseUtil.success(
        res,
        {
          user,
          token,
          message:
            "Registration successful! Please check your email to verify your account.",
        },
        "User registered successfully",
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // Login user
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password }: LoginRequest = req.body;

      // Validation
      if (!email || !password) {
        throw new BadRequestError("Email and password are required");
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user || !user.passwordHash) {
        throw new UnauthorizedError("Invalid email or password");
      }

      // Check password
      const isPasswordValid = await AuthService.comparePassword(
        password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        throw new UnauthorizedError("Invalid email or password");
      }

      // Generate JWT token
      const token = AuthService.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return ResponseUtil.success(
        res,
        {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
          },
          token,
        },
        "Login successful"
      );
    } catch (error) {
      next(error);
    }
  }

  // Verify email
  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token }: VerifyEmailRequest = req.body;

      if (!token) {
        throw new BadRequestError("Verification token is required");
      }

      // Find user with this token
      const user = await prisma.user.findUnique({
        where: { emailVerificationToken: token },
      });

      if (!user) {
        throw new BadRequestError("Invalid or expired verification token");
      }

      if (user.isEmailVerified) {
        throw new BadRequestError("Email is already verified");
      }

      // Update user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerificationToken: null, // Clear the token
        },
      });

      // Send welcome email
      try {
        await EmailService.sendWelcomeEmail(
          user.email,
          user.firstName || undefined
        );
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }

      return ResponseUtil.success(
        res,
        null,
        "Email verified successfully! You can now place orders."
      );
    } catch (error) {
      next(error);
    }
  }

  // Resend verification email
  static async resendVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new BadRequestError("Email is required");
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        throw new NotFoundError("User not found");
      }

      if (user.isEmailVerified) {
        throw new BadRequestError("Email is already verified");
      }

      // Generate new token
      const emailVerificationToken =
        AuthService.generateEmailVerificationToken();

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerificationToken },
      });

      // Send email
      await EmailService.sendVerificationEmail(
        user.email,
        emailVerificationToken
      );

      return ResponseUtil.success(
        res,
        null,
        "Verification email sent successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Forgot password
  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email }: ForgotPasswordRequest = req.body;

      if (!email) {
        throw new BadRequestError("Email is required");
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // Don't reveal if user exists or not (security)
      if (!user) {
        return ResponseUtil.success(
          res,
          null,
          "If an account exists, a password reset email has been sent"
        );
      }

      // Generate reset token
      const passwordResetToken = AuthService.generatePasswordResetToken();
      const passwordResetExpiry = AuthService.getPasswordResetExpiry();

      // Save token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken,
          passwordResetExpiry,
        },
      });

      // Send email
      await EmailService.sendPasswordResetEmail(user.email, passwordResetToken);

      return ResponseUtil.success(
        res,
        null,
        "If an account exists, a password reset email has been sent"
      );
    } catch (error) {
      next(error);
    }
  }

  // Reset password
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword }: ResetPasswordRequest = req.body;

      if (!token || !newPassword) {
        throw new BadRequestError("Token and new password are required");
      }

      const passwordValidation = AuthService.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        throw new BadRequestError(
          passwordValidation.message || "Invalid password"
        );
      }

      // Find user with this token
      const user = await prisma.user.findUnique({
        where: { passwordResetToken: token },
      });

      if (!user) {
        throw new BadRequestError("Invalid or expired reset token");
      }

      // Check if token expired
      if (
        !user.passwordResetExpiry ||
        AuthService.isPasswordResetExpired(user.passwordResetExpiry)
      ) {
        throw new BadRequestError("Reset token has expired");
      }

      // Hash new password
      const passwordHash = await AuthService.hashPassword(newPassword);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      });

      return ResponseUtil.success(
        res,
        null,
        "Password reset successful! You can now login with your new password."
      );
    } catch (error) {
      next(error);
    }
  }

  /// Get current user (protected route)
  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      // Get JWT payload from middleware
      const jwtPayload = (req as any).jwtPayload as JwtPayload | undefined;

      if (!jwtPayload?.userId) {
        throw new UnauthorizedError("User not authenticated");
      }

      const user = await prisma.user.findUnique({
        where: { id: jwtPayload.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new UnauthorizedError("User not found");
      }

      return ResponseUtil.success(res, user, "User retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // Google OAuth callback
  static async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      // Passport attaches user to req.user
      const user = (req as any).user;

      if (!user) {
        throw new UnauthorizedError("Google authentication failed");
      }

      // Generate JWT token
      const token = AuthService.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Redirect to frontend with token
      // In production, you'd redirect to your React app
      const redirectUrl = `${config.clientUrl}/auth/google/success?token=${token}`;

      res.redirect(redirectUrl);
    } catch (error) {
      next(error);
    }
  }

  // For API testing - get user info after Google auth
  static async googleSuccess(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        throw new BadRequestError("Token is required");
      }

      // Verify token
      const decoded = AuthService.verifyToken(token);

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isEmailVerified: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new UnauthorizedError("User not found");
      }

      return ResponseUtil.success(
        res,
        {
          user,
          token,
        },
        "Google authentication successful"
      );
    } catch (error) {
      next(error);
    }
  }
}
