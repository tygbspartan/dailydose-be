# Daily Dose - E-commerce Backend API

A complete, production-ready e-commerce backend for pharmaceutical and personal care products in Nepal. Built with Node.js, TypeScript, Express, Prisma, and PostgreSQL.

---

## 🚀 Features

### ✅ Complete E-commerce System
- **Authentication**: Email/Password + Google OAuth, JWT tokens, email verification, password reset
- **Product Management**: 3-level categories, brands, products with images & specifications
- **Shopping**: Cart, wishlist, saved for later
- **Orders**: Complete checkout flow with zone-based shipping (Kathmandu Valley vs outside)
- **Payments**: Cash on Delivery + Online payments (eSewa/Khalti/Bank Transfer) with transaction verification
- **Discounts**: Percentage/fixed discounts, usage limits, minimum purchase requirements
- **Reviews**: Star ratings (1-5), verified purchase badges, helpful votes, rating summaries
- **Admin Panel**: Full CRUD operations, order management, payment verification, review moderation

---

## 🛠️ Tech Stack

- **Runtime**: Node.js v18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: JWT, Passport.js (Google OAuth)
- **Email**: Nodemailer (Gmail SMTP)

---

## 📦 Installation

### 1. Clone & Install
```bash
git clone <repository-url>
cd dailydose-be
npm install
```

### 2. Environment Variables
Create `.env` file:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

DATABASE_URL="postgresql://user:password@host:port/database"

JWT_SECRET=your_secret_min_32_characters
JWT_EXPIRES_IN=7d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_16_char_app_password
EMAIL_FROM=your_email@gmail.com

GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

ADMIN_EMAIL=admin@dailydose.com
ADMIN_PASSWORD=secure_admin_password
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
```

### 3. Database Setup
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Server
```bash
npm run dev
```

Server runs at `http://localhost:5000`

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/verify-email` | Verify email | No |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password | No |
| GET | `/auth/me` | Get current user | Yes |
| GET | `/auth/google` | Google OAuth | No |

### Products
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/products` | Get all products (with filters) | No |
| GET | `/products/slug/:slug` | Get product by slug | No |
| POST | `/products` | Create product | Admin |
| PUT | `/products/:id` | Update product | Admin |
| DELETE | `/products/:id` | Delete product | Admin |

### Categories & Brands
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/categories` | Get all categories | No |
| GET | `/categories/tree` | Get category hierarchy | No |
| GET | `/brands` | Get all brands | No |
| POST | `/categories` | Create category | Admin |
| POST | `/brands` | Create brand | Admin |

### Cart & Wishlist
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/cart` | Get user's cart | Yes |
| POST | `/cart` | Add item to cart | Yes |
| PUT | `/cart/:id` | Update cart item | Yes |
| DELETE | `/cart/:id` | Remove from cart | Yes |
| GET | `/wishlist` | Get user's wishlist | Yes |
| POST | `/wishlist` | Add to wishlist | Yes |
| POST | `/wishlist/:id/move-to-cart` | Move to cart | Yes |

### Orders
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/orders/checkout` | Create order from cart | Yes |
| GET | `/orders` | Get user's orders | Yes |
| GET | `/orders/:orderNumber` | Get order details | Yes |
| GET | `/orders/admin/all` | Get all orders | Admin |
| PATCH | `/orders/admin/:id/status` | Update order status | Admin |
| PATCH | `/orders/admin/:id/payment` | Verify payment | Admin |

### Discounts
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/discounts/validate` | Validate discount code | Yes |
| GET | `/discounts` | Get all discounts | Admin |
| POST | `/discounts` | Create discount | Admin |
| PUT | `/discounts/:id` | Update discount | Admin |
| DELETE | `/discounts/:id` | Delete discount | Admin |

### Reviews
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/reviews/product/:productId` | Get product reviews | No |
| POST | `/reviews` | Create review | Yes |
| GET | `/reviews/my-reviews` | Get own reviews | Yes |
| PUT | `/reviews/:id` | Update own review | Yes |
| DELETE | `/reviews/:id` | Delete own review | Yes |
| POST | `/reviews/:id/helpful` | Mark as helpful | Yes |
| DELETE | `/reviews/:id/helpful` | Remove helpful vote | Yes |
| GET | `/reviews/admin/all` | Get all reviews | Admin |
| PATCH | `/reviews/:id/moderate` | Approve/reject review | Admin |

---

## 🔑 Key Features Explained

### Zone-Based Shipping
- **Inside Kathmandu Valley** (Kathmandu, Lalitpur, Bhaktapur): Rs 100
- **Outside Valley**: Rs 200
- **Free Shipping**: Orders ≥ Rs 2000

### Payment Methods
- **Cash on Delivery (COD)**: No transaction number needed
- **Online Payments** (eSewa/Khalti/Bank Transfer): Requires transaction number
- Admin manually verifies online payments before confirming orders

### Discount System
- **Types**: Percentage (e.g., 20% off) or Fixed (e.g., Rs 100 off)
- **Conditions**: Minimum purchase amount, maximum discount cap, usage limits
- **Validation**: Applied at checkout, automatically calculates discount
- **Usage Tracking**: Increments on order, decrements on cancellation

### Review System
- **Auto-Approved**: Reviews appear immediately (no moderation required)
- **Verified Purchase**: Badge shown if user ordered the product
- **Helpful Votes**: Users can mark reviews as helpful
- **Rating Summary**: Average rating + distribution (5★, 4★, 3★, 2★, 1★)
- **Admin Moderation**: Optional - admin can hide spam reviews

### Order Lifecycle
```
pending → confirmed → processing → shipped → delivered
                                          ↓
                                     cancelled
```

### Stock Management
- **On Order**: Stock decreases
- **On Cancellation**: Stock restored
- **Validation**: Prevents overselling

---

## 🗄️ Database Schema

### Core Models
- **User**: Authentication, profile, role (admin/customer)
- **Category**: 3-level hierarchy (Main → Sub → Product Group)
- **Brand**: Brand information, country of origin
- **Product**: Complete product details, pricing, stock
- **ProductImage**: Multiple images with primary selection
- **ProductSpecification**: Flexible key-value pairs
- **CartItem**: User's shopping cart
- **WishlistItem**: User's saved products
- **Order**: Order details, shipping info, payment
- **OrderItem**: Products in each order (snapshot)
- **Discount**: Coupon codes with conditions
- **Review**: Star ratings, comments, images
- **ReviewHelpful**: Helpful votes tracking

---

## 🧪 Testing

### Postman Collections
Import the provided Postman collections to test all endpoints:
- `Daily_Dose_Auth.postman_collection.json` - Authentication
- `Daily_Dose_Products.postman_collection.json` - Products & Catalog
- `Daily_Dose_Orders.postman_collection.json` - Cart, Orders, Checkout
- `Daily_Dose_Discounts.postman_collection.json` - Discount codes
- `Daily_Dose_Reviews.postman_collection.json` - Reviews & Ratings

### Test Accounts
- **Admin**: `admin@dailydose.com` / (your admin password)
- **Customer**: Create via `/auth/register`

---

## 📁 Project Structure
```
dailydose-be/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── env.config.ts
│   │   └── passport.config.ts
│   ├── controllers/           # Business logic
│   │   ├── auth.controller.ts
│   │   ├── product.controller.ts
│   │   ├── order.controller.ts
│   │   ├── discount.controller.ts
│   │   └── review.controller.ts
│   ├── middleware/            # Auth, error handling
│   ├── routes/                # API routes
│   ├── services/              # Email, auth services
│   ├── types/                 # TypeScript interfaces
│   ├── utils/                 # Helper functions
│   ├── constants/             # Payment methods, etc.
│   ├── app.ts
│   └── server.ts
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Deployment

### Environment Setup
1. Update `NODE_ENV=production`
2. Update `CLIENT_URL` to your frontend URL
3. Update `DATABASE_URL` to production database
4. Update `GOOGLE_CALLBACK_URL` to production URL
5. Set strong `JWT_SECRET` (32+ characters)

### Recommended Platforms
- **Backend**: Railway.app, Render.com, Heroku
- **Database**: Supabase (already using)
- **Frontend**: Vercel, Netlify

---

## 🔒 Security Features

- ✅ Password hashing (bcrypt)
- ✅ JWT authentication
- ✅ Email verification
- ✅ Password reset with time-limited tokens
- ✅ Role-based access control (RBAC)
- ✅ Input validation
- ✅ SQL injection prevention (Prisma ORM)
- ✅ Ownership validation (users can't access others' data)

---

## 📊 Order Flow Example
```
1. Customer adds products to cart
   ↓
2. Customer goes to checkout
   ↓
3. Customer enters shipping info
   ↓
4. Customer applies discount code (optional)
   ↓
5. System calculates:
   - Subtotal
   - Discount (if code valid)
   - Shipping (Rs 100 or Rs 200 based on location)
   - Total
   ↓
6. Customer selects payment method:
   - COD: Order created immediately
   - Online: Customer enters transaction number
   ↓
7. Order created:
   - Stock decreased
   - Cart cleared
   - Discount usage incremented
   ↓
8. Admin processes order:
   - Verifies payment (if online)
   - Updates status: confirmed → processing → shipped → delivered
   ↓
9. Customer can review product after delivery
```

---

## 🎯 Business Logic Highlights

### Discount Application
```typescript
// Percentage discount
discount = (subtotal × percentage) / 100
// Capped at maxDiscountAmount if set

// Fixed discount
discount = fixed_amount
// Cannot exceed subtotal

// Applied at checkout:
total = subtotal + shipping - discount
```

### Stock Management
```typescript
// On order creation
product.stockQuantity -= orderItem.quantity

// On order cancellation
product.stockQuantity += orderItem.quantity

// Stock status calculation
if (stockQuantity === 0) status = 'out_of_stock'
else if (stockQuantity <= lowStockThreshold) status = 'low_stock'
else status = 'in_stock'
```

### Verified Purchase Badge
```typescript
// Review has verified badge if:
isVerifiedPurchase = user has delivered order with this product
```

---

## 📞 API Response Format

### Success
```json
{
  "status": "success",
  "message": "Operation successful",
  "data": { ... }
}
```

### Error
```json
{
  "status": "error",
  "message": "Error description"
}
```

### Paginated
```json
{
  "status": "success",
  "data": {
    "data": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## 📈 Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Authentication | ✅ Complete | Email/Password + Google OAuth |
| Products | ✅ Complete | Full catalog with images & specs |
| Categories | ✅ Complete | 3-level hierarchy |
| Brands | ✅ Complete | Brand management |
| Cart | ✅ Complete | Shopping cart with validation |
| Wishlist | ✅ Complete | Save for later |
| Orders | ✅ Complete | Complete checkout flow |
| Shipping | ✅ Complete | Zone-based (Valley vs Outside) |
| Payments | ✅ Complete | COD + Online with verification |
| Discounts | ✅ Complete | Coupon codes with conditions |
| Reviews | ✅ Complete | Ratings, comments, helpful votes |
| Admin Panel | ✅ Complete | Full management interface |

---

## 👨‍💻 Developer

**Fibi Space**  
***Grishan Bajracharya***  
Full-Stack Developer  
Nepal

---

## 🙏 Acknowledgments

- Anthropic Claude for development assistance
- Supabase for database hosting
- Prisma for excellent ORM
- Node.js/TypeScript community

---

**Last Updated:** January 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅

---