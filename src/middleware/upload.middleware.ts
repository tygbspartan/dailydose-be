import multer from "multer";
import { fromBuffer } from "file-type";
import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../utils/customError.util";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    // Header-level check — client-reported MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new BadRequestError("Only JPEG, PNG, WebP, and GIF images are allowed") as any);
    }
    cb(null, true);
  },
});

// Run after multer — validates actual file magic bytes, not just the Content-Type header
export async function validateImageBuffer(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const files: Express.Multer.File[] = req.file
      ? [req.file]
      : Array.isArray(req.files)
      ? (req.files as Express.Multer.File[])
      : Object.values(req.files ?? {}).flat();

    for (const file of files) {
      const detected = await fromBuffer(file.buffer);
      if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
        return next(new BadRequestError("Uploaded file is not a valid image"));
      }
    }
    next();
  } catch {
    next(new BadRequestError("Could not validate uploaded file"));
  }
}
