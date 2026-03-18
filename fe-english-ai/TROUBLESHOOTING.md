# Hướng Dẫn Khắc Phục Lỗi API

## Vấn đề:
- Frontend không gọi được backend API
- Thiếu file `.env` chứa cấu hình API

## Đã sửa:
✅ Tạo file `.env` với cấu hình đúng
✅ Thêm debug logging vào API calls
✅ Sử dụng HTTP (port 5283) thay vì HTTPS để tránh lỗi SSL

## Các bước thực hiện:

### 1. Kiểm tra Backend đang chạy
Mở terminal và chạy backend:
```bash
cd d:\BTL_Project1\english-ai\EngAce\EngAce.Api
dotnet run
```

Backend sẽ chạy ở:
- HTTP: http://localhost:5283
- HTTPS: https://localhost:5000

### 2. Restart Frontend
File `.env` chỉ được load khi start server. Bạn cần:

**Bước 1:** Dừng dev server hiện tại (Ctrl+C trong terminal)

**Bước 2:** Khởi động lại:
```bash
cd d:\BTL_Project1\english-ai\english-mentor-buddy
npm run dev
```

### 3. Kiểm tra trong Browser Console
Mở DevTools (F12) → Console tab
Khi submit form, bạn sẽ thấy logs:
- 🚀 Calling API with config: ...
- ✅ API Response: ... (nếu thành công)
- ❌ API Error: ... (nếu có lỗi)

### 4. Nếu vẫn lỗi CORS:
Kiểm tra backend log có dòng:
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5283
```

### 5. Nếu vẫn không kết nối được:
Thử thay đổi `.env`:
```env
# Thử HTTPS nếu HTTP không work
VITE_API_BASE_URL=https://localhost:5000
VITE_API_ACCESS_KEY=AIzaSyCs3b
```

Hoặc kiểm tra Access Key có đúng không trong `appsettings.json`

## Cấu hình hiện tại:
- Backend URL: `http://localhost:5283`
- Access Key: `AIzaSyCs3b`
- CORS: AllowAll (Development mode)

## Kiểm tra nhanh:
Mở browser và truy cập:
http://localhost:5283/swagger

Nếu thấy Swagger UI → Backend đang hoạt động ✅
