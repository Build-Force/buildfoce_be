# Seed dữ liệu Admin Dashboard

Script `seed.ts` thêm dữ liệu mẫu vào MongoDB để trang Admin Dashboard có số liệu hiển thị.

## Cách chạy

1. Đảm bảo đã cấu hình `MONGODB_URI` trong file `.env` (thư mục `buildfoce_be`).
2. Từ thư mục **buildfoce_be** chạy:

```bash
npm run seed
```

Hoặc:

```bash
npx ts-node scripts/seed.ts
```

## Dữ liệu được tạo

- **Users**: 1 Admin, 5 HR, 10 User (nếu chưa tồn tại).
- **HR Profiles**: 5 profile gắn với 5 user HR (VERIFIED, PENDING, REJECTED...).
- **Jobs**: Nhiều tin tuyển dụng với trạng thái PENDING và APPROVED, ngày tạo rải đều trong 60 ngày.
- **Disputes**: 5 tranh chấp mẫu (OPEN, INVESTIGATING, RESOLVED).
- **Support tickets**: 5 ticket mẫu (OPEN, IN_PROGRESS, CLOSED).

## Đăng nhập Admin sau khi seed

- **Email:** `admin@buildforce.vn`
- **Mật khẩu:** `Admin@123`

Script không ghi đè dữ liệu đã có: chỉ tạo mới khi email/user chưa tồn tại.
