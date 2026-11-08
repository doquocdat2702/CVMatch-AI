const fs = require('fs');
const mammoth = require('mammoth');

const { cleanText, hasUsableText } = require('./text-cleaner');

function createError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

// Trích xuất text thuần từ file DOCX
async function extractFromDocx(filePath) {
  let buffer;
  try {
    buffer = await fs.promises.readFile(filePath);
  } catch (err) {
    throw createError('Không đọc được file CV. Vui lòng tải file lên lại.');
  }

  let result;
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch (err) {
    throw createError('File Word bị hỏng hoặc không đọc được. Vui lòng chọn file khác.');
  }

  const text = cleanText(result && result.value);

  if (!hasUsableText(text)) {
    throw createError('File Word không có nội dung chữ. Vui lòng chọn file khác.');
  }

  return text;
}

module.exports = { extractFromDocx };
