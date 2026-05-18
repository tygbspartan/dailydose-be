// ==================== CATEGORY TYPES ====================

export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  parentId?: number;
  level: number; // 1, 2, or 3
  displayOrder?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: number;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  level: number;
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
  slug?: string;
  description?: string;
  logoUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  isFeatured?: boolean;
}

export interface UpdateBrandRequest {
  name?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
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
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  productCount?: number;
}

// ==================== PRODUCT TYPES ====================

export interface CreateProductRequest {
  name: string;
  shortDescription?: string;
  longDescription?: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  sku?: string;
  brandId?: number;
  categoryId?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  effectiveFor?: string[];
  features?: string[];
  certifications?: string[];
  howToUse?: string[];
  ingredients?: string[];
  cautions?: string[];
  metaTitle?: string;
  metaDescription?: string;
  images?: {
    imageUrl: string;
    altText?: string;
    isPrimary: boolean;
    displayOrder: number;
  }[];
  specifications?: {
    key: string;
    value: string;
  }[];
}

export interface UpdateProductRequest {
  name?: string;
  shortDescription?: string;
  longDescription?: string;
  price?: number;
  originalPrice?: number;
  costPrice?: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
  sku?: string;
  brandId?: number;
  categoryId?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  effectiveFor?: string[];
  features?: string[];
  certifications?: string[];
  howToUse?: string[];
  ingredients?: string[];
  cautions?: string[];
  metaTitle?: string;
  metaDescription?: string;
  images?: {
    imageUrl: string;
    altText?: string;
    isPrimary: boolean;
    displayOrder: number;
  }[];
  specifications?: {
    key: string;
    value: string;
  }[];
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
