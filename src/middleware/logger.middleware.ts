import { Request, Response, NextFunction } from "express";

const SENSITIVE_PARAMS = ["token", "reset_token", "access_token", "code"];

function scrubUrl(url: string): string {
  try {
    const [path, qs] = url.split("?");
    if (!qs) return url;
    const scrubbed = qs
      .split("&")
      .map((part) => {
        const [key] = part.split("=");
        return SENSITIVE_PARAMS.includes(key.toLowerCase()) ? `${key}=[REDACTED]` : part;
      })
      .join("&");
    return `${path}?${scrubbed}`;
  } catch {
    return url;
  }
}

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = `${req.method} ${scrubUrl(req.originalUrl)} ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 400) {
      console.error(`❌ ${log}`);
    } else if (duration > 1000) {
      console.warn(`🐢 SLOW ${log}`);
    } else {
      console.log(`✅ ${log}`);
    }
  });

  next();
};
