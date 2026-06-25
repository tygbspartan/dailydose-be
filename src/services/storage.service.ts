import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env.config";

const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
);

const BUCKET = config.supabaseStorageBucket;

export const StorageService = {
  /**
   * Upload a single image file to Supabase Storage.
   * Returns the public URL of the uploaded file.
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: "products" | "brands" | "categories" | "hero" = "products",
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
    const storagePath = StorageService.extractPath(publicUrl);
    if (!storagePath) return;

    await supabase.storage.from(BUCKET).remove([storagePath]);
  },

  /**
   * Delete multiple images from Supabase Storage at once.
   * More efficient than deleting one by one.
   */
  async deleteImages(publicUrls: string[]): Promise<void> {
    const paths = publicUrls
      .map(StorageService.extractPath)
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
