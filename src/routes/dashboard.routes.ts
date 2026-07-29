import express from "express";
import { getDashboardStats } from "../controllers/dashboard.controller";
import { authenticate, isSuperadmin } from "../middleware/auth.middleware"; // Your auth middleware

const router = express.Router();

// GET /api/dashboard/admin/stats?startDate=2026-01-01&endDate=2026-01-31
// Global platform stats — superadmin only.
router.get("/admin/stats", authenticate, isSuperadmin, getDashboardStats);

export default router;
