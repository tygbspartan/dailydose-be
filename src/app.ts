import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import passport from "./config/passport.config";
import { requestLogger } from "./middleware/logger.middleware";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.middleware";
import apiRoutes from "./routes";
import { config } from "./config/env.config";
import { apiLimiter } from "./middleware/rateLimit";

const app: Application = express();

// Behind a reverse proxy in production (e.g. cPanel/Passenger + Apache) so the
// client IP comes from X-Forwarded-For — required for correct rate limiting.
app.set("trust proxy", 1);

// Security headers — CSP and COEP disabled to avoid breaking OAuth redirects and API clients
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Middleware
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true, limit: "500kb" }));
app.use(requestLogger);

// Initialize Passport
app.use(passport.initialize());

// Serve locally-stored uploads in production (local disk storage).
// In development images live in Supabase, so this isn't needed.
if (config.nodeEnv === "production") {
  app.use(
    "/uploads",
    // Relax CORP for these public product/brand/hero images so the frontend
    // (different origin) can load them. Helmet's global same-origin CORP would
    // otherwise block them with "blocked:CORP not same-origin". Scoped to this
    // route only — API responses keep the stricter same-origin default.
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(config.uploadDir),
  );
}

// API Routes (generous global rate limit as a flood backstop)
app.use("/api", apiLimiter, apiRoutes);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
