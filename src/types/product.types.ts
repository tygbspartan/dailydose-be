// ==================== CATEGORY TYPES ====================

export interface CreateCategoryRequest {
  name: string;
  slug?: string; // Auto-generate if not provided
  description?: string;
  parentId?: number;
  level: number; // 1, 2, or 3
  imageUrl?: string;
  displayOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: number;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  level: number;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent?: CategoryResponse;
  children?: CategoryResponse[];
  productCount?: number;
}

// ==================== BRAND TYPES ====================

export interface CreateBrandRequest {
  name: string;
  slug?: string; // Auto-generate if not provided
  description?: string;
  logoUrl?: string;
  countryOfOrigin?: string;
  metaTitle?: string;
  metaDescription?: string;
  isFeatured?: boolean
}

export interface UpdateBrandRequest {
  name?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  countryOfOrigin?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface BrandResponse {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  countryOfOrigin: string | null;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  productCount?: number;
}

// ==================== PRODUCT TYPES ====================

export interface CreateProductRequest {
  name: string;
  slug?: string; // Auto-generate if not provided
  sku?: string;
  brandId?: number;
  categoryId?: number;

  price: number;
  originalPrice?: number;
  costPrice?: number;

  shortDescription?: string;
  longDescription?: string;

  volume?: string;
  weight?: number;
  countryOfOrigin?: string;

  effectiveFor?: string[]; // Array of strings
  features?: string[]; // Array of strings
  certifications?: string[]; // Array of strings
  howToUse?: string;
  ingredients?: string;
  cautions?: string;

  stockQuantity?: number;
  lowStockThreshold?: number;

  metaTitle?: string;
  metaDescription?: string;

  isFeatured?: boolean;
  badges?: string[]; // Array of strings
}

export interface UpdateProductRequest {
  name?: string;
  slug?: string;
  sku?: string;
  brandId?: number;
  categoryId?: number;

  price?: number;
  originalPrice?: number;
  costPrice?: number;

  shortDescription?: string;
  longDescription?: string;

  volume?: string;
  weight?: number;
  countryOfOrigin?: string;

  effectiveFor?: string[];
  features?: string[];
  certifications?: string[];
  howToUse?: string;
  ingredients?: string;
  cautions?: string;

  stockQuantity?: number;
  lowStockThreshold?: number;

  metaTitle?: string;
  metaDescription?: string;

  isActive?: boolean;
  isFeatured?: boolean;
  badges?: string[];
}

export interface ProductImageRequest {
  imageUrl: string;
  altText?: string;
  isPrimary?: boolean;
  displayOrder?: number;
}

export interface ProductSpecificationRequest {
  key: string;
  value: string;
}

export interface ProductResponse {
  id: number;
  name: string;
  slug: string;
  sku: string | null;

  brandId: number | null;
  categoryId: number | null;

  price: number;
  originalPrice: number | null;
  costPrice?: number | null; // Hidden from customers

  shortDescription: string | null;
  longDescription: string | null;

  volume: string | null;
  weight: number | null;
  countryOfOrigin: string | null;

  effectiveFor: string[] | null;
  features: string[] | null;
  certifications: string[] | null;
  howToUse: string | null;
  ingredients: string | null;
  cautions: string | null;

  stockQuantity: number;
  lowStockThreshold: number;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";

  isActive: boolean;
  isFeatured: boolean;
  badges: string[] | null;

  discountPercentage?: number; // Calculated field

  createdAt: Date;
  updatedAt: Date;

  brand?: BrandResponse;
  category?: CategoryResponse;
  images?: ProductImageResponse[];
  specifications?: ProductSpecificationResponse[];
}

export interface ProductImageResponse {
  id: number;
  imageUrl: string;
  altText: string | null;
  isPrimary: boolean;
  displayOrder: number;
}

export interface ProductSpecificationResponse {
  id: number;
  key: string;
  value: string;
}

// ==================== QUERY/FILTER TYPES ====================

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string; // Search in name, description
  categoryId?: number;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  sortBy?: "name" | "price" | "createdAt" | "popularity";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
