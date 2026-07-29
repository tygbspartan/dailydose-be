import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { config } from "../config/env.config";

export type UploadFolder = "products" | "brands" | "categories" | "hero";

/**
 * Common storage interface. Two implementations exist:
 *  - Supabase Storage (used in development)
 *  - Local disk under /uploads (used in production)
 * The active one is chosen by NODE_ENV, so all call sites stay identical.
 */
export interface IStorageService {
  uploadImage(file: Express.Multer.File, folder?: UploadFolder): Promise<string>;
  deleteImage(publicUrl: string): Promise<void>;
  deleteImages(publicUrls: string[]): Promise<void>;
  extractPath(publicUrl: string): string | null;
}

// ==================== Supabase (development) ====================

const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
);

const BUCKET = config.supabaseStorageBucket;

export const SupabaseStorageService: IStorageService = {
  /**
   * Upload a single image file to Supabase Storage.
   * Returns the public URL of the uploaded file.
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: UploadFolder = "products",
  ): Promise<string> {
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return data.publicUrl;
  },

  /**
   * Delete a single image from Supabase Storage by its public URL.
   * Silently ignores if the path cannot be parsed (e.g. external URLs).
   */
  async deleteImage(publicUrl: string): Promise<void> {
    const storagePath = SupabaseStorageService.extractPath(publicUrl);
    if (!storagePath) return;

    await supabase.storage.from(BUCKET).remove([storagePath]);
  },

  /**
   * Delete multiple images from Supabase Storage at once.
   * More efficient than deleting one by one.
   */
  async deleteImages(publicUrls: string[]): Promise<void> {
    const paths = publicUrls
      .map(SupabaseStorageService.extractPath)
      .filter((p): p is string => p !== null);

    if (paths.length === 0) return;

    await supabase.storage.from(BUCKET).remove(paths);
  },

  /**
   * Extract the storage path from a Supabase public URL.
   * e.g. "https://xxx.supabase.co/storage/v1/object/public/images/products/abc.jpg"
   *   → "products/abc.jpg"
   * Returns null for URLs that don't belong to our bucket.
   */
  extractPath(publicUrl: string): string | null {
    try {
      const marker = `/object/public/${BUCKET}/`;
      const idx = publicUrl.indexOf(marker);
      if (idx === -1) return null;
      return publicUrl.slice(idx + marker.length);
    } catch {
      return null;
    }
  },
};

// ==================== Local disk (production) ====================

// Where images are written on disk (configurable via UPLOAD_DIR; defaults to
// <project-root>/uploads). Kept outside dist/ so it survives rebuilds.
const UPLOAD_DIR = config.uploadDir;

export const LocalStorageService: IStorageService = {
  /**
   * Write the uploaded file to <uploads>/<folder>/<filename> and return
   * a public URL served by express.static (see app.ts).
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: UploadFolder = "products",
  ): Promise<string> {
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const folderPath = path.join(UPLOAD_DIR, folder);

    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(path.join(folderPath, filename), file.buffer);

    return `${config.publicBaseUrl}/uploads/${folder}/${filename}`;
  },

  /**
   * Delete a single local image by its public URL.
   * Silently ignores missing files or unparseable/external URLs.
   */
  async deleteImage(publicUrl: string): Promise<void> {
    const storagePath = LocalStorageService.extractPath(publicUrl);
    if (!storagePath) return;

    try {
      await fs.unlink(path.join(UPLOAD_DIR, storagePath));
    } catch {
      // File already gone — ignore.
    }
  },

  async deleteImages(publicUrls: string[]): Promise<void> {
    await Promise.all(
      publicUrls.map((url) => LocalStorageService.deleteImage(url)),
    );
  },

  /**
   * Extract the on-disk path (relative to UPLOAD_DIR) from a public URL.
   * e.g. "https://api.dailydose.skin/uploads/products/abc.jpg" → "products/abc.jpg"
   */
  extractPath(publicUrl: string): string | null {
    const marker = "/uploads/";
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
  },
};

// ==================== Active implementation ====================

// Production → local disk; anything else (development) → Supabase.
export const StorageService: IStorageService =
  config.nodeEnv === "production"
    ? LocalStorageService
    : SupabaseStorageService;
