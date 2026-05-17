import express from "express";
import { getDashboardStats } from "../controllers/dashboard.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware"; // Your auth middleware

const router = express.Router();

// GET /api/dashboard/admin/stats?startDate=2026-01-01&endDate=2026-01-31
router.get("/admin/stats", authenticate, isAdmin, getDashboardStats);

export default router;
