# Deploy Backend lên Render

## Lỗi: `Cannot find module '/opt/render/project/src/dist/server.ts'`

**Nguyên nhân:** Start Command đang dùng `node dist/server.ts`. Trên server cần chạy file **JavaScript** đã compile (`.js`), không phải file TypeScript (`.ts`).

## Cấu hình đúng trên Render

1. **Root Directory:** `buildfoce_be` (nếu repo có cả frontend + backend).
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start` hoặc `node dist/server.js` (không dùng `server.ts`).

Sau khi `npm run build` (tsc), thư mục `dist/` sẽ có `server.js`. Lệnh `npm start` trong package.json đã chạy `node dist/server.js`.
