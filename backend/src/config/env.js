require('dotenv').config();

// Các biến bắt buộc phải có khi khởi động server
const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET'];

const missing = REQUIRED_VARS.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(
    `Thiếu biến môi trường bắt buộc: ${missing.join(', ')}. ` +
      'Hãy tạo file .env dựa trên .env.example.'
  );
}

// Khóa ký JWT quá ngắn dễ bị dò, không cho server khởi động
const MIN_JWT_SECRET_LENGTH = 32;
if (process.env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
  throw new Error(
    `JWT_SECRET phải có ít nhất ${MIN_JWT_SECRET_LENGTH} ký tự (hiện có ${process.env.JWT_SECRET.length}). ` +
      'Hãy đặt chuỗi ngẫu nhiên dài hơn trong .env.'
  );
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  // Dùng cho bước NLP parsing, không bắt buộc:
  // thiếu key thì hệ thống tự lùi về phần rule-based
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || null,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  // Gửi thư quên mật khẩu qua Gmail, không bắt buộc:
  // thiếu thì forgot-password chỉ ghi log lỗi, vẫn trả câu chung
  MAIL_USER: process.env.MAIL_USER || null,
  // App Password Google hiển thị dạng "abcd efgh ijkl mnop", bỏ khoảng trắng
  MAIL_APP_PASSWORD: (process.env.MAIL_APP_PASSWORD || '').replace(/\s+/g, '') || null,
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || 'CVMatch',
  // Địa chỉ frontend, dùng để tạo link đặt lại mật khẩu trong thư
  FRONTEND_URL: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  // Origin được phép gọi API từ trình duyệt, nhiều origin cách nhau bởi dấu phẩy
  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
};

module.exports = env;
