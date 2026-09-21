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

const env = {
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  // Dùng cho bước NLP parsing, không bắt buộc:
  // thiếu key thì hệ thống tự lùi về phần rule-based
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || null,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
};

module.exports = env;
