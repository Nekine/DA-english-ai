# DALTK - Hệ thống học tiếng Anh tích hợp AI (Monorepo)

Đây là dự án web full-stack học tiếng Anh cá nhân hóa bằng AI, gồm cổng người học, cổng quản trị, thống kê doanh thu, bài thi mô phỏng TOEIC, thanh toán gói dịch vụ và lưu trữ dữ liệu trên SQL Server.

## 1) Cấu trúc tổng thể

- be-english-ai/: Backend API (NodeJs + TypeScript + SQL Server)
- fe-english-ai/: Frontend web (ReactJs + Vite + TypeScript)

## 2) Mô tả đầy đủ chức năng của website

### 2.1 Chức năng cho người dùng học tập

- Đăng nhập, đăng ký, đăng nhập Google OAuth
- Trang chủ học tập
- Từ điển tiếng Anh (tra cứu) và trang kết quả từ điển
- Luyện tập tổng hợp theo bài tập AI
- Viết luận tiếng Anh (Writing)
- Chế độ viết (Writing Mode)
- Luyện nghe (Listening)
- Luyện nói (Speaking)
- Luyện đọc hiểu (Reading Exercises)
- Luyện viết câu (Sentence Writing)
- Thực hành viết câu (Sentence Practice)
- Chat AI hỗ trợ học tiếng Anh
- Thống kê kết quả bài thi/bài làm (Test Statistics)
- Tiến độ học tập cá nhân (Progress)
- Lộ trình học tập cá nhân hóa (Roadmap)
- Bảng xếp hạng (Leaderboard)

### 2.2 Chức năng thi mô phỏng TOEIC

- Danh sách đề thi (Test List)
- Cấu hình đề thi (Test Configuration)
- Làm bài thi (Test Exam)
- Chấm điểm và ghi nhận kết quả bài thi

### 2.3 Chức năng gói dịch vụ và thanh toán

- Trang bảng giá (Pricing)
- Trang thanh toán (Checkout)
- Tích hợp luồng thanh toán (bao gồm PayOS ở backend)
- Theo dõi trạng thái giao dịch và dữ liệu doanh thu

### 2.4 Chức năng quản trị (Admin)

- Dashboard quản trị tổng quan
- Quản lý người dùng
- Quản lý doanh thu
- Quản lý bài tập và đề thi
- Quản lý AI Review
- Cài đặt hệ thống
- Quản lý tài khoản quản trị
- Hồ sơ quản trị viên

## 3) Kiến trúc hệ thống

### Frontend (fe-english-ai)

- Công nghệ chính:
  - React 18 + TypeScript
  - Vite
  - TailwindCSS + Radix UI
  - TanStack Query
  - React Router
  - Recharts (biểu đồ thống kê, doanh thu)
- Cơ chế gọi API:
  - Frontend gọi đường dẫn tương đối /api/...
  - Vite proxy chuyển tiếp sang backend (VITE_API_TARGET, mặc định http://localhost:3000)
- Xác thực:
  - Lưu token đăng nhập ở local storage
  - Tự động xóa thông tin đăng nhập và chuyển về trang login khi API trả 401

### Backend (be-english-ai)

- Công nghệ chính:
  - Node.js + TypeScript (ESM)
  - Express 5
  - Zod (validate request)
  - SQL Server (mssql/msnodesqlv8)
  - JWT Authentication
- Kiến trúc lớp:
  - Routes -> Controllers -> Services -> Repositories -> SQL Server
- Nhóm API lớn:
  - Auth và người dùng: auth, users, user-management, user-progress
  - Học tập AI: assignment, exercise, listening, speaking, reading-exercise, review, sentence-writing, writing-exercise, dictionary, chatbot
  - Thi cử: test-exam
  - Phân tích dữ liệu: progress, statistics, leaderboard, learning-insights, dashboard, ai-review
  - Nghiệp vụ quản trị/thanh toán: admin, payment, transaction
  - Hỗ trợ vận hành: healthcheck, debug

## 4) Mô hình dữ liệu (SQL Server)

Schema chính nằm tại:

- be-english-ai/src/database/sqlserver/sqlserver_ai_english_mentor_buddy_schema_v4.sql

Các bảng nghiệp vụ trọng tâm:

- Người dùng và tài khoản: TaiKhoan, NguoiDung, bảng chính sách loại tài khoản
- Học tập AI: BaiTapAI và các bảng bài làm/tiến độ liên quan
- Thi cử: dữ liệu đề thi và bài làm đề thi
- Thanh toán/gói dịch vụ: GoiDangKy, ThanhToan
- Từ điển và dữ liệu hỗ trợ học tập

## 5) Biến môi trường cần cấu hình

Hiện tại file .env không được commit trong repository, cần tự tạo khi chạy local.

### Backend (be-english-ai)

- Server và app:
  - NODE_ENV, PORT, DB_ENABLED
- JWT và bảo mật:
  - JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, JWT_EXPIRE_MINUTES
  - PASSWORD_SALT_ROUNDS
- OAuth:
  - GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET
  - GOOGLE_OAUTH_REDIRECT_URI, GOOGLE_OAUTH_FRONTEND_REDIRECT_URI
- CSDL SQL Server:
  - DB_AUTH_MODE, DB_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
  - DB_ODBC_DRIVER, DB_ENCRYPT, DB_TRUST_SERVER_CERTIFICATE
  - DB_POOL_MIN, DB_POOL_MAX, DB_CONNECTION_TIMEOUT_MS, DB_REQUEST_TIMEOUT_MS
- Thanh toán:
  - PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY, PAYOS_RETURN_URL, PAYOS_CANCEL_URL
- AI Provider:
  - OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_STT_MODEL
  - GEMINI_API_KEY, GEMINI_BASE_URL, GEMINI_API_STYLE, GEMINI_MODEL, GEMINI_STT_MODEL
  - XAI_API_KEY, XAI_BASE_URL, XAI_STT_MODEL

### Frontend (fe-english-ai)

- VITE_API_TARGET
- VITE_API_URL
- VITE_AUTH0_CLIENT_ID
- VITE_AUTH0_DOMAIN
- VITE_AUTH0_REDIRECT_URI

## 6) Hướng dẫn chạy dự án local

### Yêu cầu

- Node.js 20+
- npm
- SQL Server đã tạo schema

### Cài dependency

Backend:

```bash
cd be-english-ai
npm install
```

Frontend:

```bash
cd fe-english-ai
npm install
```

### Chạy backend

```bash
cd be-english-ai
npm run dev
```

### Chạy frontend

```bash
cd fe-english-ai
npm run dev
```

Frontend mặc định chạy tại http://localhost:5173 và gọi backend qua proxy /api.

## 7) Lệnh kiểm tra chất lượng mã nguồn

Backend:

```bash
cd be-english-ai
npm run typecheck
npm test
```

Frontend:

```bash
cd fe-english-ai
npm run build
npm run lint
```

## 8) Ghi chú quan trọng

- Nếu backend báo lỗi thiếu module cấu hình env khi khởi động, kiểm tra lại các file import trong src/config.
- Trên Windows PowerShell, nếu bị chặn npm do execution policy, có thể chạy bằng npm.cmd.
