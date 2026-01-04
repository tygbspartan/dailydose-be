import { Router, Request, Response, NextFunction } from "express";
import { ResponseUtil } from "../utils/response.util";
import { NotFoundError, BadRequestError } from "../utils/customError.util";

const router = Router();

// Test success response
router.get("/success", (req: Request, res: Response) => {
  return ResponseUtil.success(res, { test: "data" }, "Test successful");
});

// Test error throwing
router.get("/error", (req: Request, res: Response, next: NextFunction) => {
  try {
    throw new BadRequestError("This is a test error");
  } catch (error) {
    next(error);
  }
});

// Test 404 error
router.get("/not-found", (req: Request, res: Response, next: NextFunction) => {
  try {
    throw new NotFoundError("Test resource not found");
  } catch (error) {
    next(error);
  }
});

export default router;
