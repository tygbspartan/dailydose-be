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
