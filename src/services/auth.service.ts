import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env.config';
import { JwtPayload } from '../types/auth.types';
import { TokenUtil } from '../utils/token.util';

export class AuthService {
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password with hash
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // Generate JWT token (FIXED with explicit types)
  static generateToken(payload: JwtPayload): string {
    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const options: any = {
      expiresIn: config.jwtExpiresIn || '7d',
    };

    return jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      } as object,
      config.jwtSecret,
      options
    );
  }

  // Verify JWT token
  static verifyToken(token: string): JwtPayload {
    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  }

  // Generate email verification token
  static generateEmailVerificationToken(): string {
    return TokenUtil.generateToken(32);
  }

  // Generate password reset token
  static generatePasswordResetToken(): string {
    return TokenUtil.generateToken(32);
  }

  // Get password reset token expiry
  static getPasswordResetExpiry(): Date {
    return TokenUtil.getTokenExpiry(config.passwordResetTokenExpiry);
  }

  // Check if password reset token is expired
  static isPasswordResetExpired(expiryDate: Date): boolean {
    return TokenUtil.isTokenExpired(expiryDate);
  }

  // Validate password strength
  static validatePassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters long' };
    }
    
    return { valid: true };
  }

  // Validate email format
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}