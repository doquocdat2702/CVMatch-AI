const env = require('./config/env');
const app = require('./app');
const prisma = require('./config/prisma');
const { ensureSingleCompany, companySyncMessage } = require('./modules/company/company.service');

const NLP_MODE_DESCRIPTIONS = {
  hybrid: 'rule + Gemini',
  rule: 'chỉ rule, không gọi Gemini',
};

// Kết nối DB và đồng bộ công ty duy nhất theo COMPANY_NAME TRƯỚC khi nhận request (G7):
// tạo công ty nếu chưa có, đổi tên theo COMPANY_NAME, gán HR chưa có công ty.
// Lỗi (không kết nối được DB...) thì dừng hẳn, không chạy server khi chưa chắc có công ty
async function start() {
  try {
    await prisma.$connect();
    const result = await ensureSingleCompany(env.COMPANY_NAME);
    const message = companySyncMessage(result);
    if (result.status === 'multiple') {
      console.warn(message);
    } else {
      console.log(message);
    }
  } catch (err) {
    console.error(`Không khởi động được server: ${err.message}`);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`Server is running at http://localhost:${env.PORT}`);
    console.log(`NLP_MODE=${env.NLP_MODE}: phân tích CV / JD bằng ${NLP_MODE_DESCRIPTIONS[env.NLP_MODE]}`);
  });
}

start();
