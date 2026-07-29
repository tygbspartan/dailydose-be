import rateLimit from "express-rate-limit";

// Standardized JSON error shape (matches the app's error responses).
const message = (msg: string) => ({ status: "error", message: msg });

/**
 * Strict limiter for sensitive auth endpoints (login, register, password reset,
 * verification resend). Throttles brute-force and enumeration attempts.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // per IP per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message(
    "Too many attempts. Please wait a few minutes and try again.",
  ),
});

/**
 * Moderate limiter for checkout to curb order spam / abuse. Guests and
 * logged-in users alike are limited by IP.
 */
export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Too many checkout attempts. Please try again shortly."),
});

/**
 * Generous catch-all limiter applied to the whole API as a backstop against
 * scraping / floods. Well above normal usage so real users never hit it.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Too many requests. Please slow down."),
});
