import crypto from "crypto";

export class TokenUtil {
  // Generate a random token (for email verification and password reset)
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  // Calculate token expiry time
  static getTokenExpiry(duration: string): Date {
    const now = new Date();

    // Parse duration string (e.g., "1h", "24h", "7d")
    const value = parseInt(duration);
    const unit = duration.slice(-1);

    switch (unit) {
      case "h": // hours
        now.setHours(now.getHours() + value);
        break;
      case "d": // days
        now.setDate(now.getDate() + value);
        break;
      case "m": // minutes
        now.setMinutes(now.getMinutes() + value);
        break;
      default:
        // Default to 1 hour if format is invalid
        now.setHours(now.getHours() + 1);
    }

    return now;
  }

  // Check if token has expired
  static isTokenExpired(expiryDate: Date): boolean {
    return new Date() > expiryDate;
  }
}
