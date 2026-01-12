export interface CreateDiscountRequest {
  name: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  productIds?: number[]; // Optional: Link to specific products
}

export interface UpdateDiscountRequest {
  name?: string;
  code?: string;
  type?: "percentage" | "fixed";
  value?: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  usageLimit?: number;
}

export interface ApplyDiscountRequest {
  code: string;
  cartSubtotal: number;
}

export interface ApplyDiscountResponse {
  valid: boolean;
  discount?: {
    id: number;
    name: string;
    code: string;
    type: string;
    value: number;
    discountAmount: number;
  };
  message?: string;
}

export interface DiscountResponse {
  id: number;
  name: string;
  code: string;
  type: string;
  value: number;
  minPurchaseAmount: number | null;
  maxDiscountAmount: number | null;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  usageLimit: number | null;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
  products?: {
    id: number;
    name: string;
  }[];
}
