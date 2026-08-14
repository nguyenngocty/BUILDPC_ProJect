# BuildPC Backend MVC — Client & Admin

Backend Express + MySQL được chia rõ thành hai nhóm API:

- **Client API**: dành cho website người mua (`/api/client/...`).
- **Admin API**: dành cho trang quản trị (`/api/admin/...`).
- **Model dùng chung**: model là nơi sau này chứa SQL, được cả client và admin tái sử dụng.

## 1. Cài và chạy

```bash
npm install
npm run dev
```

Giữ nguyên `.env` đang kết nối database hosting thành công. Không commit `.env` lên GitHub.

## 2. Cấu trúc

```text
backend/
├── config/                 # Kết nối database
├── controllers/
│   ├── client/             # Nghiệp vụ phía khách hàng
│   ├── admin/              # Nghiệp vụ trang quản trị
│   └── healthController.js
├── models/                 # SQL/model dùng chung
├── routes/
│   ├── client/             # URL /api/client/...
│   ├── admin/              # URL /api/admin/...
│   └── index.js
├── middlewares/            # Lỗi, xác thực và phân quyền
├── utils/
├── app.js
└── server.js
```

## 3. Endpoint đang có

Endpoint chạy thật:

- `GET /`
- `GET /api/health`

Các endpoint phía dưới chỉ là khung và hiện trả về `501` cho đến khi bạn triển khai database/chức năng.

### Client API

- `POST /api/client/auth/register`
- `POST /api/client/auth/login`
- `GET /api/client/auth/profile`
- `PATCH /api/client/auth/profile`
- `GET /api/client/products`
- `GET /api/client/products/:slug`
- `GET /api/client/categories`
- `GET /api/client/cart`
- `POST /api/client/cart/items`
- `PATCH /api/client/cart/items/:itemId`
- `DELETE /api/client/cart/items/:itemId`
- `POST /api/client/orders`
- `GET /api/client/orders`
- `GET /api/client/orders/:id`
- `POST /api/client/builds`
- `GET /api/client/builds`

### Admin API

- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me`
- `GET /api/admin/dashboard/summary`
- `GET|POST /api/admin/products`
- `GET|PATCH|DELETE /api/admin/products/:id`
- `GET|POST /api/admin/categories`
- `PATCH|DELETE /api/admin/categories/:id`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id/status`
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/status`
- `GET|POST /api/admin/posts`
- `PATCH|DELETE /api/admin/posts/:id`

## 4. Luồng MVC

```text
React client/admin → Route → Controller → Model → MySQL
```

Sau khi làm JWT, dùng `authMiddleware.js` để xác thực người dùng và `adminMiddleware.js` để chỉ cho role `admin` truy cập các route `/api/admin`.
