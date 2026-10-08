// Đặt lại mật khẩu tài khoản admin mặc định (ADMIN_EMAIL) theo ADMIN_PASSWORD trong .env.
// Dùng khi admin duy nhất quên mật khẩu. Chạy trong thư mục backend:
//   node scripts/reset-admin-password.js
require('dotenv').config();

const prisma = require('../src/config/prisma');
const { hashPassword } = require('../src/utils/hash');

// Cùng quy tắc với đăng ký / đổi mật khẩu
const MIN_PASSWORD_LENGTH = 6;

async function main() {
  // Đọc giống prisma/seed.js để tìm đúng tài khoản seed đã tạo
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD trong .env.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
  if (!user) {
    throw new Error(`Không tìm thấy tài khoản ${email}. Hãy chạy seed để tạo admin mặc định.`);
  }
  if (user.role.name !== 'ADMIN') {
    throw new Error(`Tài khoản ${email} không phải ADMIN (role hiện tại: ${user.role.name}).`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(password) },
  });
  console.log(`Đã đặt lại mật khẩu cho admin ${email} theo ADMIN_PASSWORD trong .env.`);

  if (!user.isActive) {
    console.warn('CẢNH BÁO: tài khoản này đang bị khóa, vẫn chưa đăng nhập được.');
  }
}

main()
  .catch((err) => {
    console.error('Đặt lại mật khẩu thất bại:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
