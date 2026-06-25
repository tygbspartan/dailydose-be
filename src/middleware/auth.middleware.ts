import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { UnauthorizedError, ForbiddenError } from "../utils/customError.util";
import { JwtPayload } from "../types/auth.types";

// Extend Request to include our JWT payload
interface AuthRequest extends Request {
  jwtPayload?: JwtPayload;
}

// Middleware to authenticate user (check JWT token)
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided. Please login.");
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = AuthService.verifyToken(token);

    // Attach user to request (using any to avoid Passport conflict)
    (req as any).jwtPayload = decoded;

    next();
  } catch (error) {
    next(
      new UnauthorizedError("Invalid or expired token. Please login again.")
    );
  }
};

// Middleware for optional authentication.
// If a valid token is present, attach req.jwtPayload (same as authenticate).
// If there's no token or the token is invalid, do NOT throw — just continue
// without jwtPayload (used for guest-friendly routes like guest checkout).
export const optionalAuthenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = AuthService.verifyToken(token);
    (req as any).jwtPayload = decoded;
  } catch (error) {
    // Invalid/expired token on an optional route — treat as guest.
  }

  next();
};

// Middleware to check if user is admin
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const jwtPayload = (req as any).jwtPayload as JwtPayload | undefined;

    if (!jwtPayload) {
      throw new UnauthorizedError("User not authenticated");
    }

    if (jwtPayload.role !== "admin") {
      throw new ForbiddenError("Access denied. Admin privileges required.");
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check if email is verified
export const isEmailVerified = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const jwtPayload = (req as any).jwtPayload as JwtPayload | undefined;

    if (!jwtPayload) {
      throw new UnauthorizedError("User not authenticated");
    }

    // We could check from database, but for now just pass through
    // The actual check can be done in the controller when needed
    next();
  } catch (error) {
    next(error);
  }
};

// Combined middleware: authenticate AND admin check
export const authenticateAdmin = [authenticate, isAdmin];
