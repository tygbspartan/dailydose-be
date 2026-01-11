export interface AddToCartRequest {
  productId: number;
  quantity?: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CartItemResponse {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: number;
    name: string;
    slug: string;
    price: number;
    originalPrice: number | null;
    stockQuantity: number;
    stockStatus: "in_stock" | "low_stock" | "out_of_stock";
    images: {
      imageUrl: string;
      altText: string | null;
      isPrimary: boolean;
    }[];
  };
}

export interface CartSummary {
  items: CartItemResponse[];
  summary: {
    totalItems: number;
    subtotal: number;
    estimatedTotal: number;
  };
}

export interface WishlistItemResponse {
  id: number;
  userId: number;
  productId: number;
  createdAt: Date;
  product: {
    id: number;
    name: string;
    slug: string;
    price: number;
    originalPrice: number | null;
    stockQuantity: number;
    stockStatus: "in_stock" | "low_stock" | "out_of_stock";
    images: {
      imageUrl: string;
      altText: string | null;
      isPrimary: boolean;
    }[];
  };
}
