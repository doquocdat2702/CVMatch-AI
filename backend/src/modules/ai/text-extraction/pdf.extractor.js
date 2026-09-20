const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const { cleanText, hasUsableText } = require('./text-cleaner');

function createError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

// Trích xuất text thuần từ file PDF
async function extractFromPdf(filePath) {
  let buffer;
  try {
    buffer = await fs.promises.readFile(filePath);
  } catch (err) {
    throw createError('Không đọc được file PDF trên máy chủ');
  }

  let parser;
  let result;
  try {
    parser = new PDFParse({ data: buffer });
    // pageJoiner rỗng để không chèn dòng đánh dấu số trang vào text
    result = await parser.getText({ pageJoiner: '\n' });
  } catch (err) {
    throw createError('File PDF bị hỏng hoặc không đọc được nội dung');
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }

  const text = cleanText(result && result.text);

  if (!hasUsableText(text)) {
    throw createError(
      'File PDF không chứa văn bản, có thể là bản scan. Vui lòng tải lên file PDF có text'
    );
  }

  return text;
}

module.exports = { extractFromPdf };
