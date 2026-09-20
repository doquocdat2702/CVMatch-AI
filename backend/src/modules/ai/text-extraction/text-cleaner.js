// Làm sạch text dùng chung cho mọi extractor (PDF, DOCX)
function cleanText(rawText) {
  if (typeof rawText !== 'string') {
    return '';
  }

  // Chuẩn hóa ký tự xuống dòng
  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Bỏ ký tự điều khiển, giữ lại xuống dòng và tab
  let cleaned = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const code = text.charCodeAt(i);
    if (ch === '\n') {
      cleaned += ch;
    } else if (ch === '\t') {
      cleaned += ' ';
    } else if (code >= 32 && code !== 127) {
      cleaned += ch;
    }
  }
  text = cleaned;

  text = text
    // Gộp khoảng trắng liên tiếp trong cùng một dòng
    .split('\n')
    .map((line) => line.replace(/[  ]+/g, ' ').trim())
    .join('\n');

  // Gộp nhiều dòng trống liên tiếp thành một dòng trống
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

// PDF scan hoặc file rỗng thì text gần như không có ký tự nào
function hasUsableText(text) {
  const meaningful = text.replace(/\s/g, '');
  return meaningful.length >= 10;
}

module.exports = { cleanText, hasUsableText };
