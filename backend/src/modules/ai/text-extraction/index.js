const { extractFromPdf } = require('./pdf.extractor');
const { extractFromDocx } = require('./docx.extractor');

// Chọn extractor theo fileType đã lưu trong CV (PDF | DOCX)
async function extractText(filePath, fileType) {
  const type = typeof fileType === 'string' ? fileType.trim().toUpperCase() : '';

  if (type === 'PDF') {
    return extractFromPdf(filePath);
  }
  if (type === 'DOCX') {
    return extractFromDocx(filePath);
  }

  const err = new Error('Chỉ hỗ trợ trích xuất file PDF hoặc DOCX');
  err.statusCode = 400;
  throw err;
}

module.exports = { extractText, extractFromPdf, extractFromDocx };
