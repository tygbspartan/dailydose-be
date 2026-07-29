import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { UnauthorizedError, ForbiddenError } from "../utils/customError.util";
import { JwtPayload } from "../types/auth.types";
import prisma from "../config/database.config";
import { ROLES, isPrivileged } from "../constants/roles.constants";

// Extend Request to include our JWT payload
interface AuthRequest extends Request {
  jwtPayload?: JwtPayload;
}

// Middleware to authenticate a user. Verifies the JWT AND checks the user
// against the DB: they must still exist, be active, and carry the current
// tokenVersion (bumped on password change/reset & deactivation → revokes old
// tokens). Attaches the FRESH role so downstream guards can trust it.
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided. Please login.");
    }

    const decoded = AuthService.verifyToken(authHeader.split(" ")[1]);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true, tokenVersion: true },
    });
    if (!user) {
      throw new UnauthorizedError("User not found. Please login again.");
    }
    if (!user.isActive) {
      throw new ForbiddenError("Your account has been deactivated.");
    }
    if ((decoded.tokenVersion ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedError("Session expired. Please login again.");
    }

    // Attach with the fresh role (may have changed since the token was issued).
    (req as any).jwtPayload = { ...decoded, role: user.role };
    next();
  } catch (error) {
    // Preserve deactivated (403) / explicit auth errors; everything else = 401.
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      return next(error);
    }
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

// Vendor (admin) OR superadmin. Runs after `authenticate`, which has already
// validated the account and set the fresh role — so a plain role check is safe.
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).jwtPayload?.role;
  if (!isPrivileged(role)) {
    return next(
      new ForbiddenError("Access denied. Admin privileges required.")
    );
  }
  next();
};

// Superadmin (platform operator) only.
export const isSuperadmin = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).jwtPayload?.role;
  if (role !== ROLES.SUPERADMIN) {
    return next(
      new ForbiddenError("Access denied. Superadmin privileges required.")
    );
  }
  next();
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

// Combined middleware: authenticate AND admin (vendor/superadmin) check
export const authenticateAdmin = [authenticate, isAdmin];

// Combined middleware: authenticate AND superadmin check
export const authenticateSuperadmin = [authenticate, isSuperadmin];
