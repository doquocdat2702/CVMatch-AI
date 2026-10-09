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

// Chế độ phân tích CV / JD: hybrid = rule + Gemini (mặc định), rule = chỉ rule, không gọi Gemini.
// Sai giá trị thì không cho server khởi động, tránh âm thầm chạy sai chế độ.
const NLP_MODES = ['rule', 'hybrid'];
const nlpMode = (process.env.NLP_MODE || 'hybrid').trim().toLowerCase();
if (!NLP_MODES.includes(nlpMode)) {
  throw new Error(`NLP_MODE phải là ${NLP_MODES.join(' hoặc ')} (đang là "${process.env.NLP_MODE}").`);
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  // Thời gian tối đa (ms) trích xuất text một file CV, quá thì CV chuyển FAILED; không bắt buộc
  EXTRACT_TIMEOUT_MS:
    Number(process.env.EXTRACT_TIMEOUT_MS) > 0 ? Number(process.env.EXTRACT_TIMEOUT_MS) : 15000,
  NLP_MODE: nlpMode,
  // Dùng cho bước NLP ở chế độ hybrid: thiếu key thì parse CV / JD trả 503.
  // Chế độ rule không dùng tới key này
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
