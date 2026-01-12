export const PAYMENT_METHODS = {
  COD: "cod", // Cash on Delivery
  ESEWA: "esewa", // eSewa (QR Code)
  KHALTI: "khalti", // Khalti (QR Code)
  BANK_TRANSFER: "bank_transfer", // Bank Transfer (QR Code)
} as const;

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAYMENT_STATUS = {
  PENDING: "pending", // Awaiting payment or verification
  PAID: "paid", // Payment confirmed by admin
  FAILED: "failed", // Payment failed or rejected
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// Payment methods that require transaction number
export const ONLINE_PAYMENT_METHODS = [
  PAYMENT_METHODS.ESEWA,
  PAYMENT_METHODS.KHALTI,
  PAYMENT_METHODS.BANK_TRANSFER,
];

// Check if payment method requires transaction number
export const requiresTransactionNumber = (paymentMethod: string): boolean => {
  return ONLINE_PAYMENT_METHODS.includes(paymentMethod as any);
};
