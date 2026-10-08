const nodemailer = require('nodemailer');
const env = require('./env');

// Gửi thư qua Gmail SMTP, đăng nhập bằng App Password (không dùng mật khẩu Gmail thật)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: env.MAIL_USER, pass: env.MAIL_APP_PASSWORD },
});

async function sendMail({ to, subject, text, html }) {
  if (!env.MAIL_USER || !env.MAIL_APP_PASSWORD) {
    throw new Error('Chưa cấu hình MAIL_USER hoặc MAIL_APP_PASSWORD trong .env');
  }

  return transporter.sendMail({
    from: { name: env.MAIL_FROM_NAME, address: env.MAIL_USER },
    to,
    subject,
    text,
    html,
  });
}

module.exports = { transporter, sendMail };
