import { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
  statusCode?: number;
  errors?: any;
  code?: string; // Prisma known-request error code (e.g. "P2002")
  meta?: any; // Prisma error metadata
}

/**
 * Map Prisma errors to friendly client responses so DB internals never leak
 * and common cases (duplicate, not found) return the right status code.
 * Returns null for non-Prisma errors.
 */
function mapPrismaError(
  err: CustomError,
): { statusCode: number; message: string } | null {
  if (err.name === "PrismaClientValidationError") {
    return { statusCode: 400, message: "Invalid request data." };
  }

  if (err.name === "PrismaClientKnownRequestError") {
    switch (err.code) {
      case "P2002": {
        // Unique constraint failed
        const fields = err.meta?.target;
        const field = Array.isArray(fields) ? fields.join(", ") : fields;
        return {
          statusCode: 409,
          message: field
            ? `A record with this ${field} already exists.`
            : "A record with these details already exists.",
        };
      }
      case "P2025":
        // Record required but not found
        return { statusCode: 404, message: "Record not found." };
      case "P2003":
        // Foreign key constraint failed
        return { statusCode: 400, message: "Related record does not exist." };
      default:
        return { statusCode: 400, message: "Database request failed." };
    }
  }

  return null;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const isProd = process.env.NODE_ENV === "production";

  // Prefer an explicit statusCode from a thrown custom error; otherwise try to
  // interpret Prisma errors; otherwise fall back to 500.
  const prisma = err.statusCode ? null : mapPrismaError(err);
  const statusCode = err.statusCode || prisma?.statusCode || 500;

  // Always log the real error server-side.
  console.error("❌ Error:", {
    name: err.name,
    code: err.code,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Client-facing message: never expose internal 5xx details in production.
  let message: string;
  if (prisma) {
    message = prisma.message;
  } else if (statusCode >= 500) {
    message = isProd ? "Internal Server Error" : err.message || "Internal Server Error";
  } else {
    message = err.message || "Request failed";
  }

  res.status(statusCode).json({
    status: "error",
    message,
    ...(!isProd && {
      stack: err.stack,
      errors: err.errors,
    }),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.originalUrl} not found`,
  });
};
