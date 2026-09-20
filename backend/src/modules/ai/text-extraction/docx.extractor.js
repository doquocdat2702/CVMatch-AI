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
    throw createError('Không đọc được file DOCX trên máy chủ');
  }

  let result;
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch (err) {
    throw createError('File DOCX bị hỏng hoặc không đọc được nội dung');
  }

  const text = cleanText(result && result.value);

  if (!hasUsableText(text)) {
    throw createError('File DOCX không chứa văn bản');
  }

  return text;
}

module.exports = { extractFromDocx };
