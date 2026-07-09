interface OrderEmailData {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  paymentMethod: string;
  shippingAddress: string;
}

export const generateCustomerOrderEmail = (data: OrderEmailData): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #ed1b24;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 20px;
      border: 1px solid #ddd;
      border-top: none;
    }
    .order-details {
      background-color: white;
      padding: 15px;
      margin: 15px 0;
      border-radius: 5px;
    }
    .item {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .item:last-child {
      border-bottom: none;
    }
    .totals {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #ddd;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
    }
    .total-row.final {
      font-size: 18px;
      font-weight: bold;
      color: #ed1b24;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Thank You for Your Order!</h1>
  </div>
  
  <div class="content">
    <p>Dear ${data.customerName},</p>
    
    <p>Thank you for choosing Daily Dose! We're excited to process your order.</p>
    
    <div class="order-details">
      <h2>Order Details</h2>
      <p><strong>Order Number:</strong> ${data.orderNumber}</p>
      <p><strong>Order Date:</strong> ${data.orderDate}</p>
      <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
      
      <h3>Items Ordered:</h3>
      ${data.items
        .map(
          (item) => `
        <div class="item">
          <strong>${item.name}</strong><br>
          Quantity: ${item.quantity} × Rs ${item.price.toFixed(2)} = Rs ${(
            item.quantity * item.price
          ).toFixed(2)}
        </div>
      `
        )
        .join("")}
      
      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>Rs ${data.subtotal.toFixed(2)}</span>
        </div>
        ${
          data.discount > 0
            ? `
        <div class="total-row">
          <span>Discount:</span>
          <span>- Rs ${data.discount.toFixed(2)}</span>
        </div>
        `
            : ""
        }
        <div class="total-row">
          <span>Shipping:</span>
          <span>Rs ${data.shippingCost.toFixed(2)}</span>
        </div>
        <div class="total-row final">
          <span>Total:</span>
          <span>Rs ${data.total.toFixed(2)}</span>
        </div>
      </div>
      
      <h3>Shipping Address:</h3>
      <p>${data.shippingAddress}</p>
    </div>
    
    <p>We'll send you another email once your order has been shipped.</p>
    
    <p>If you have any questions about your order, please don't hesitate to contact us.</p>
    
    <p>Best regards,<br>
    <strong>The Daily Dose Team</strong></p>
  </div>
  
  <div class="footer">
    <p>This is an automated email. Please do not reply to this message.</p>
    <p>&copy; ${new Date().getFullYear()} Daily Dose. All rights reserved.</p>
  </div>
</body>
</html>
  `;
};

// Order status change notification (shipped / delivered / cancelled)
export const generateOrderStatusEmail = (data: {
  customerName: string;
  orderNumber: string;
  status: "shipped" | "delivered" | "cancelled";
}): string => {
  const statusConfig: Record<
    "shipped" | "delivered" | "cancelled",
    { color: string; title: string; message: string }
  > = {
    shipped: {
      color: "#2563eb",
      title: "Your Order Is On Its Way! 🚚",
      message: `Good news, ${data.customerName}! Your order <strong>${data.orderNumber}</strong> has been shipped and is on its way to you.`,
    },
    delivered: {
      color: "#16a34a",
      title: "Your Order Has Been Delivered! 📦",
      message: `Hi ${data.customerName}, your order <strong>${data.orderNumber}</strong> has been delivered. We hope you love it!`,
    },
    cancelled: {
      color: "#dc2626",
      title: "Your Order Has Been Cancelled",
      message: `Hi ${data.customerName}, your order <strong>${data.orderNumber}</strong> has been cancelled. If this wasn't expected or you have any questions, please contact us.`,
    },
  };

  const cfg = statusConfig[data.status];

  const reviewLine =
    data.status === "delivered"
      ? `<p style="margin:20px 0 0;color:#15803d;font-size:15px;line-height:1.7;">
           Thank you for shopping with us! We'd love to hear what you think —
           <a href="${process.env.CLIENT_URL}" style="color:#16a34a;font-weight:600;">please leave a review</a>.
         </p>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${cfg.color}; color: white; padding: 24px 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 24px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin:0;">${cfg.title}</h1>
  </div>
  <div class="content">
    <p>${cfg.message}</p>
    ${reviewLine}
    <p style="margin-top:24px;">If you have any questions, just reply to this email — we're happy to help.</p>
    <p>Best regards,<br><strong>The Daily Dose Team</strong></p>
  </div>
</body>
</html>
  `;
};

// Payment received confirmation
export const generatePaymentReceivedEmail = (data: {
  customerName: string;
  orderNumber: string;
  amount: number;
  paymentMethod: string;
}): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #16a34a; color: white; padding: 24px 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 24px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
    .amount-box { background-color: #f0fdf4; border:1px solid #86efac; border-radius: 8px; padding: 16px 20px; margin: 16px 0; text-align:center; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin:0;">Payment Received Successfully ✅</h1>
  </div>
  <div class="content">
    <p>Hi ${data.customerName},</p>
    <p>We've successfully received your payment for order <strong>${data.orderNumber}</strong>. Thank you!</p>
    <div class="amount-box">
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Amount Paid</p>
      <p style="margin:0;font-size:24px;font-weight:bold;color:#15803d;">Rs ${data.amount.toFixed(2)}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">via ${data.paymentMethod}</p>
    </div>
    <p>Your order is now being processed and we'll keep you updated on its progress.</p>
    <p>Best regards,<br><strong>The Daily Dose Team</strong></p>
  </div>
</body>
</html>
  `;
};

export const generateAdminOrderNotification = (
  data: OrderEmailData & { customerEmail: string; customerPhone: string }
): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #2563eb;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 20px;
      border: 1px solid #ddd;
      border-top: none;
    }
    .alert-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 15px 0;
    }
    .order-details {
      background-color: white;
      padding: 15px;
      margin: 15px 0;
      border-radius: 5px;
    }
    .item {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .item:last-child {
      border-bottom: none;
    }
    .totals {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #ddd;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
    }
    .total-row.final {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
    }
    .action-button {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 5px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔔 New Order Received!</h1>
  </div>
  
  <div class="content">
    <div class="alert-box">
      <strong>Action Required:</strong> A new order has been placed and requires processing.
    </div>
    
    <div class="order-details">
      <h2>Order Information</h2>
      <p><strong>Order Number:</strong> ${data.orderNumber}</p>
      <p><strong>Order Date:</strong> ${data.orderDate}</p>
      <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
      ${
        data.paymentMethod !== "Cash on Delivery"
          ? `<p><strong>⚠️ Payment Status:</strong> Awaiting Verification</p>`
          : ""
      }
      
      <h3>Customer Details:</h3>
      <p><strong>Name:</strong> ${data.customerName}</p>
      <p><strong>Email:</strong> ${data.customerEmail}</p>
      <p><strong>Phone:</strong> ${data.customerPhone}</p>
      
      <h3>Items Ordered:</h3>
      ${data.items
        .map(
          (item) => `
        <div class="item">
          <strong>${item.name}</strong><br>
          Quantity: ${item.quantity} × Rs ${item.price.toFixed(2)} = Rs ${(
            item.quantity * item.price
          ).toFixed(2)}
        </div>
      `
        )
        .join("")}
      
      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>Rs ${data.subtotal.toFixed(2)}</span>
        </div>
        ${
          data.discount > 0
            ? `
        <div class="total-row">
          <span>Discount:</span>
          <span>- Rs ${data.discount.toFixed(2)}</span>
        </div>
        `
            : ""
        }
        <div class="total-row">
          <span>Shipping:</span>
          <span>Rs ${data.shippingCost.toFixed(2)}</span>
        </div>
        <div class="total-row final">
          <span>Total:</span>
          <span>Rs ${data.total.toFixed(2)}</span>
        </div>
      </div>
      
      <h3>Shipping Address:</h3>
      <p>${data.shippingAddress}</p>
    </div>
    
    <p style="text-align: center;">
      <a href="${process.env.CLIENT_URL}/admin/orders" class="action-button">
        View Order in Admin Panel
      </a>
    </p>
    
    <p><strong>Next Steps:</strong></p>
    <ul>
      ${
        data.paymentMethod !== "Cash on Delivery"
          ? "<li>Verify the payment transaction</li>"
          : ""
      }
      <li>Update order status to 'Processing'</li>
      <li>Prepare items for shipment</li>
      <li>Update customer with tracking information</li>
    </ul>
  </div>
</body>
</html>
  `;
};
