import { Request, Response, NextFunction } from "express";
import prisma from "../config/database.config";
import { ResponseUtil } from "../utils/response.util";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "../utils/customError.util";
import {
  CreateReviewRequest,
  UpdateReviewRequest,
  ModerateReviewRequest,
} from "../types/review.types";
import { JwtPayload } from "../types/auth.types";

export class ReviewController {
  // ==================== CUSTOMER ENDPOINTS ====================

  // Create review
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, rating, title, comment, images }: CreateReviewRequest =
        req.body;

      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      // Validation
      if (!productId || !rating || !comment) {
        throw new BadRequestError(
          "Product ID, rating, and comment are required"
        );
      }

      if (rating < 1 || rating > 5) {
        throw new BadRequestError("Rating must be between 1 and 5");
      }

      if (!comment || comment.trim().length === 0) {
        throw new BadRequestError("Comment cannot be empty");
      }

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      // Check if user already reviewed this product
      const existingReview = await prisma.review.findUnique({
        where: {
          productId_userId: {
            productId,
            userId: jwtPayload.userId,
          },
        },
      });

      if (existingReview) {
        throw new ConflictError("You have already reviewed this product");
      }

      // Check if user has purchased this product (verified purchase)
      const order = await prisma.order.findFirst({
        where: {
          userId: jwtPayload.userId,
          status: "delivered",
          items: {
            some: {
              productId,
            },
          },
        },
        include: {
          items: {
            where: {
              productId,
            },
          },
        },
      });

      const isVerifiedPurchase = !!order;
      const orderId = order?.id || null;

      // Create review
      const review = await prisma.review.create({
        data: {
          productId,
          userId: jwtPayload.userId,
          orderId,
          rating,
          title,
          comment,
          images: images ? JSON.stringify(images) : null,
          isVerifiedPurchase,
          isApproved: true,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Parse images back to array
      const reviewResponse = {
        ...review,
        images: review.images ? JSON.parse(review.images) : null,
      };

      return ResponseUtil.success(
        res,
        reviewResponse,
        "Review submitted successfully.",
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // Get user's own reviews
  static async getMyReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      const reviews = await prisma.review.findMany({
        where: { userId: jwtPayload.userId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Parse images
      const reviewsWithImages = reviews.map((review) => ({
        ...review,
        images: review.images ? JSON.parse(review.images) : null,
      }));

      return ResponseUtil.success(
        res,
        reviewsWithImages,
        "Reviews retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Update own review
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData: UpdateReviewRequest = req.body;
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      const reviewId = parseInt(id);

      // Check if review exists and belongs to user
      const existingReview = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!existingReview || existingReview.userId !== jwtPayload.userId) {
        throw new NotFoundError("Review not found");
      }

      // Validate rating if provided
      if (
        updateData.rating &&
        (updateData.rating < 1 || updateData.rating > 5)
      ) {
        throw new BadRequestError("Rating must be between 1 and 5");
      }

      // Validate comment if provided
      if (!updateData.comment || updateData.comment.trim().length === 0) {
        throw new BadRequestError("Comment cannot be empty");
      }

      // Prepare update data
      const dataToUpdate: any = {};

      if (updateData.rating) dataToUpdate.rating = updateData.rating;
      if (updateData.title !== undefined) dataToUpdate.title = updateData.title;
      if (updateData.comment) dataToUpdate.comment = updateData.comment;
      if (updateData.images !== undefined) {
        dataToUpdate.images = updateData.images
          ? JSON.stringify(updateData.images)
          : null;
      }

      // Update review
      const review = await prisma.review.update({
        where: { id: reviewId },
        data: dataToUpdate,
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Parse images
      const reviewResponse = {
        ...review,
        images: review.images ? JSON.parse(review.images) : null,
      };

      return ResponseUtil.success(
        res,
        reviewResponse,
        "Review updated successfully."
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete own review
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      const reviewId = parseInt(id);

      // Check if review exists and belongs to user
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!review || review.userId !== jwtPayload.userId) {
        throw new NotFoundError("Review not found");
      }

      // Delete review
      await prisma.review.delete({
        where: { id: reviewId },
      });

      return ResponseUtil.success(res, null, "Review deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  // Get reviews for a product (Public - anyone can view)
  static async getProductReviews(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { productId } = req.params;
      const { rating, sortBy = "createdAt", sortOrder = "desc" } = req.query;

      const jwtPayload = (req as any).jwtPayload as JwtPayload | undefined;

      // Build filter
      const where: any = {
        productId: parseInt(productId),
        isApproved: true, // Only show approved reviews
      };

      if (rating) {
        where.rating = parseInt(rating as string);
      }

      // Get reviews
      const reviews = await prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          helpfulVotes: jwtPayload
            ? {
                where: {
                  userId: jwtPayload.userId,
                },
              }
            : false,
        },
        orderBy: {
          [sortBy as string]: sortOrder,
        },
      });

      // Parse images and add hasVoted flag
      const reviewsWithImages = reviews.map((review) => ({
        ...review,
        images: review.images ? JSON.parse(review.images) : null,
        hasVoted: jwtPayload
          ? (review.helpfulVotes as any[]).length > 0
          : false,
        helpfulVotes: undefined, // Remove from response
      }));

      // Calculate rating summary
      const allReviews = await prisma.review.findMany({
        where: { productId: parseInt(productId), isApproved: true },
        select: { rating: true },
      });

      const ratingDistribution = {
        5: allReviews.filter((r) => r.rating === 5).length,
        4: allReviews.filter((r) => r.rating === 4).length,
        3: allReviews.filter((r) => r.rating === 3).length,
        2: allReviews.filter((r) => r.rating === 2).length,
        1: allReviews.filter((r) => r.rating === 1).length,
      };

      const averageRating =
        allReviews.length > 0
          ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
          : 0;

      return ResponseUtil.success(res, {
        reviews: reviewsWithImages,
        summary: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews: allReviews.length,
          ratingDistribution,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark review as helpful
  static async markHelpful(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      const reviewId = parseInt(id);

      // Check if review exists
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundError("Review not found");
      }

      // Check if user already voted
      const existingVote = await prisma.reviewHelpful.findUnique({
        where: {
          reviewId_userId: {
            reviewId,
            userId: jwtPayload.userId,
          },
        },
      });

      if (existingVote) {
        throw new ConflictError(
          "You have already marked this review as helpful"
        );
      }

      // Create helpful vote and increment count
      await prisma.$transaction([
        prisma.reviewHelpful.create({
          data: {
            reviewId,
            userId: jwtPayload.userId,
          },
        }),
        prisma.review.update({
          where: { id: reviewId },
          data: {
            helpfulCount: {
              increment: 1,
            },
          },
        }),
      ]);

      return ResponseUtil.success(
        res,
        null,
        "Review marked as helpful successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Remove helpful vote
  static async removeHelpful(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const jwtPayload = (req as any).jwtPayload as JwtPayload;

      const reviewId = parseInt(id);

      // Check if vote exists
      const vote = await prisma.reviewHelpful.findUnique({
        where: {
          reviewId_userId: {
            reviewId,
            userId: jwtPayload.userId,
          },
        },
      });

      if (!vote) {
        throw new NotFoundError("Helpful vote not found");
      }

      // Remove vote and decrement count
      await prisma.$transaction([
        prisma.reviewHelpful.delete({
          where: {
            reviewId_userId: {
              reviewId,
              userId: jwtPayload.userId,
            },
          },
        }),
        prisma.review.update({
          where: { id: reviewId },
          data: {
            helpfulCount: {
              decrement: 1,
            },
          },
        }),
      ]);

      return ResponseUtil.success(
        res,
        null,
        "Helpful vote removed successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  // Get all reviews (Admin)
  static async getAllReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { isApproved, rating, page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filter
      const where: any = {};

      if (isApproved !== undefined) {
        where.isApproved = isApproved === "true";
      }

      if (rating) {
        where.rating = parseInt(rating as string);
      }

      // Get reviews with pagination
      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: "desc" },
        }),
        prisma.review.count({ where }),
      ]);

      // Parse images
      const reviewsWithImages = reviews.map((review) => ({
        ...review,
        images: review.images ? JSON.parse(review.images) : null,
      }));

      return ResponseUtil.success(
        res,
        {
          data: reviewsWithImages,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
        "Reviews retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Moderate review (Admin)
  static async moderate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isApproved, adminNote }: ModerateReviewRequest = req.body;

      const reviewId = parseInt(id);

      if (isApproved === undefined) {
        throw new BadRequestError("isApproved field is required");
      }

      // Check if review exists
      const existingReview = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!existingReview) {
        throw new NotFoundError("Review not found");
      }

      // Update review
      const review = await prisma.review.update({
        where: { id: reviewId },
        data: {
          isApproved,
          adminNote,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Parse images
      const reviewResponse = {
        ...review,
        images: review.images ? JSON.parse(review.images) : null,
      };

      return ResponseUtil.success(
        res,
        reviewResponse,
        `Review ${isApproved ? "approved" : "rejected"} successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete review (Admin)
  static async adminDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const reviewId = parseInt(id);

      // Check if review exists
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundError("Review not found");
      }

      // Delete review
      await prisma.review.delete({
        where: { id: reviewId },
      });

      return ResponseUtil.success(res, null, "Review deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}
