export interface CheckoutRequest {
  shippingInfo: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    city: string;
    province?: string;
    postalCode: string;
    country?: string;
  };
  paymentMethod: "cod" | "esewa" | "khalti" | "bank_transfer";
  transactionNumber?: string;
  customerNote?: string;
  discountCode?: string; 
}

export interface UpdateOrderStatusRequest {
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  adminNote?: string;
}

export interface UpdatePaymentStatusRequest {
  paymentStatus: "pending" | "paid" | "failed";
  adminNote?: string;
}

export interface OrderResponse {
  id: number;
  orderNumber: string;
  userId: number;
  status: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  shippingFullName: string;
  shippingPhone: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingLandmark: string | null;
  shippingCity: string;
  shippingProvince: string | null;
  shippingPostalCode: string;
  shippingCountry: string;
  paymentMethod: string;
  paymentStatus: string;
  transactionNumber: string | null;
  customerNote: string | null;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemResponse[];
}

export interface OrderItemResponse {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  productSku: string | null;
  productImage: string | null;
  price: number;
  quantity: number;
  subtotal: number;
  createdAt: Date;
}

// ✅ UPDATED: Kathmandu Valley cities
export const KATHMANDU_VALLEY_CITIES = [
  "kathmandu",
  "lalitpur",
  "bhaktapur",
  "kirtipur",
  "madhyapur thimi",
  "thimi",
];

// ✅ UPDATED: Shipping cost configuration
export const SHIPPING_CONFIG = {
  INSIDE_VALLEY: 100, // Rs 100 for Kathmandu Valley
  OUTSIDE_VALLEY: 200, // Rs 200 outside valley
  FREE_SHIPPING_THRESHOLD: 2000, // Free shipping above Rs 2000
};

// ✅ NEW: Helper function to check if city is in valley
export const isInsideValley = (city: string): boolean => {
  const normalizedCity = city.toLowerCase().trim();
  return KATHMANDU_VALLEY_CITIES.some(
    (valleyCity) =>
      normalizedCity.includes(valleyCity) || valleyCity.includes(normalizedCity)
  );
};

// ✅ NEW: Calculate shipping cost based on city
export const calculateShippingCost = (
  city: string,
  subtotal: number
): number => {
  // Free shipping if subtotal >= threshold
  if (subtotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD) {
    return 0;
  }

  // Inside valley: Rs 100, Outside valley: Rs 200
  return isInsideValley(city)
    ? SHIPPING_CONFIG.INSIDE_VALLEY
    : SHIPPING_CONFIG.OUTSIDE_VALLEY;
};
