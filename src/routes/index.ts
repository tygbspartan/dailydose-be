import { Router } from "express";
import testRoutes from "./test.routes";

const router = Router();

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "success",
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

// Test routes
router.use("/test", testRoutes);

// Future routes
// router.use('/auth', authRoutes);
// router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);

export default router;
