// Thử trích xuất text từ một file CV:
//   node scripts/test-extract.js "duong/dan/cv.pdf"
const path = require('path');

const { extractText } = require('../src/modules/ai/text-extraction');

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error('Thiếu đường dẫn file. Ví dụ: node scripts/test-extract.js ./uploads/cv.pdf');
    process.exitCode = 1;
    return;
  }

  const absolutePath = path.resolve(process.cwd(), inputPath);
  const ext = path.extname(absolutePath).toLowerCase();
  const fileType = ext === '.pdf' ? 'PDF' : ext === '.docx' ? 'DOCX' : ext;

  try {
    const text = await extractText(absolutePath, fileType);
    console.log(`--- FILE: ${absolutePath}`);
    console.log(`--- LOAI: ${fileType} | SO KY TU: ${text.length}`);
    console.log('--- NOI DUNG ---');
    console.log(text);
  } catch (err) {
    console.error('Trích xuất thất bại:', err.message);
    process.exitCode = 1;
  }
}

main();
