# Hướng dẫn tích hợp thanh toán QR Code

## Tổng quan
Tính năng thanh toán bằng mã QR đã được tích hợp vào trang Checkout, sử dụng chuẩn VietQR để tạo mã QR tự động điền thông tin chuyển khoản.

## Thông tin ngân hàng
- **Ngân hàng**: Techcombank
- **Số tài khoản**: 999914052004
- **Chủ tài khoản**: LE TRUNG KIEN
- **Số tiền**: 218,900 VNĐ

## Cách hoạt động

### 1. Luồng thanh toán
1. Người dùng điền thông tin (Họ tên, Email, Số điện thoại)
2. Chọn phương thức "Chuyển khoản ngân hàng"
3. Nhấn nút "Tạo mã QR thanh toán"
4. Hệ thống tạo mã QR với:
   - Số tiền: 218,900 VNĐ (cố định)
   - Nội dung: `[Họ tên] [Số điện thoại] [Email]`
   - Thông tin tài khoản: Techcombank - 999914052004

### 2. Tạo mã QR
Sử dụng VietQR API để tạo mã QR:
```
https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-compact2.png?amount={AMOUNT}&addInfo={CONTENT}&accountName={ACCOUNT_NAME}
```

**Tham số:**
- `BANK_ID`: 970407 (mã ngân hàng Techcombank)
- `ACCOUNT_NO`: 999914052004
- `AMOUNT`: 218900
- `CONTENT`: Họ tên + Số điện thoại + Email (được encode)
- `ACCOUNT_NAME`: LE TRUNG KIEN

### 3. Nội dung chuyển khoản
Format: `[Họ tên] [Số điện thoại] [Email]`

Ví dụ: `Nguyen Van A 0912345678 example@email.com`

Nội dung này giúp:
- Xác định người thanh toán
- Liên hệ khi cần thiết
- Tự động kích hoạt tài khoản Premium

## Tính năng

### ✅ Đã triển khai
- [x] Tạo mã QR tự động
- [x] Hiển thị thông tin ngân hàng đầy đủ
- [x] Copy nhanh các thông tin (số TK, số tiền, nội dung)
- [x] Dialog hiển thị mã QR và hướng dẫn
- [x] Hỗ trợ chuyển khoản thủ công (khi không quét được QR)
- [x] Thông báo lưu ý về nội dung chuyển khoản

### 🔄 Cần bổ sung (backend)
- [ ] API webhook nhận thông báo từ ngân hàng
- [ ] Xác thực giao dịch tự động
- [ ] Kích hoạt tài khoản Premium tự động
- [ ] Gửi email xác nhận thanh toán
- [ ] Lưu lịch sử giao dịch

## Cách test

### 1. Test UI
```bash
npm run dev
# Truy cập: http://localhost:5173/checkout
```

### 2. Test QR Code
1. Điền form thông tin
2. Chọn "Chuyển khoản ngân hàng"
3. Nhấn "Tạo mã QR thanh toán"
4. Kiểm tra:
   - Mã QR hiển thị chính xác
   - Thông tin ngân hàng đầy đủ
   - Nội dung chuyển khoản đúng format
   - Các nút copy hoạt động

### 3. Test thanh toán thực tế
1. Quét mã QR bằng app ngân hàng
2. Kiểm tra thông tin tự động điền:
   - ✅ Số tài khoản: 999914052004
   - ✅ Số tiền: 218,900 VNĐ
   - ✅ Nội dung: [Họ tên] [SĐT] [Email]
3. Xác nhận chuyển khoản

## Bảo mật
- ⚠️ Không lưu thông tin thanh toán nhạy cảm trên frontend
- ✅ Sử dụng HTTPS cho production
- ✅ Validate nội dung chuyển khoản phía backend
- ✅ Xác thực giao dịch qua webhook ngân hàng

## Hỗ trợ
- VietQR API: https://vietqr.io
- Tài liệu: https://vietqr.io/portal-service/document
- Techcombank: 1800 588 822
