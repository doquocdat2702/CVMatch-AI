# CVMatch-AI

Hệ thống CV Parsing và Job Description Matching cho một công ty: đọc CV, tách yêu cầu từ mô tả công việc và đối chiếu
hồ sơ ứng viên với từng yêu cầu. Gồm `backend/` (Node.js, Express, Prisma, MySQL) và `frontend/` (React, Vite).

## Vận hành

Các lệnh dưới đây chạy trong thư mục `backend`, đọc cấu hình từ `backend/.env`.

| Việc | Lệnh |
|---|---|
| Áp dụng migration lên database (sao lưu database trước) | `npx prisma migrate deploy` |
| Tạo dữ liệu nền: vai trò, công ty, quản trị viên, kỹ năng | `npm run seed` |
| Chạy server khi phát triển | `npm run dev` |
| Chạy server | `npm start` |
| Đặt lại mật khẩu quản trị viên | `node scripts/reset-admin-password.js` |

### Đặt lại mật khẩu quản trị viên

Quên mật khẩu qua email chỉ dành cho ứng viên. Mật khẩu của nhà tuyển dụng do quản trị viên đặt lại trong trang
Tài khoản. Khi quản trị viên duy nhất quên mật khẩu:

1. Đặt mật khẩu mới vào `ADMIN_PASSWORD` trong `backend/.env` (ít nhất 6 ký tự).
2. Chạy `node scripts/reset-admin-password.js` trong thư mục `backend`.

Lệnh đặt lại mật khẩu cho tài khoản `ADMIN_EMAIL`. Tài khoản đang bị khóa thì lệnh vẫn đổi mật khẩu nhưng in cảnh báo,
cần mở khóa thì mới đăng nhập được.

### Đổi tên công ty

Sửa `COMPANY_NAME` trong `backend/.env` rồi khởi động lại server. Mỗi lần khởi động, server đặt tên công ty theo biến
này.
