export interface CreateReviewRequest {
  productId: number;
  rating: number;
  title?: string;
  comment: string;
  images?: string[]; // Array of image URLs
}

export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  comment?: string;
  images?: string[];
}

export interface ModerateReviewRequest {
  isApproved: boolean;
  adminNote?: string;
}

export interface ReviewResponse {
  id: number;
  productId: number;
  userId: number;
  orderId: number | null;
  rating: number;
  title: string | null;
  comment: string;
  images: string[] | null;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  adminNote: string | null;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  product?: {
    id: number;
    name: string;
  };
  hasVoted?: boolean; // If current user has voted helpful
}

export interface ProductRatingSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
