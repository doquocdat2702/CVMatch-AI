const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const env = require('../../config/env');
const { sendMail } = require('../../config/mail');
const { hashPassword, comparePassword } = require('../../utils/hash');
const { signToken } = require('../../utils/jwt');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const RESET_PURPOSE = 'reset';
const RESET_TOKEN_EXPIRES_IN = '15m';
const INVALID_RESET_LINK = 'Link không hợp lệ hoặc đã hết hạn';

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Đăng ký chỉ dành cho ứng viên (Candidate)
async function register({ email, password, fullName }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedFullName = typeof fullName === 'string' ? fullName.trim() : '';

  if (!normalizedEmail) {
    throw createError('Email không được để trống', 400);
  }
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw createError('Email không đúng định dạng', 400);
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw createError(`Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`, 400);
  }
  if (!normalizedFullName) {
    throw createError('Họ tên không được để trống', 400);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw createError('Email đã được sử dụng', 400);
  }

  const candidateRole = await prisma.role.findUnique({ where: { name: 'CANDIDATE' } });
  if (!candidateRole) {
    throw createError('Chưa có role CANDIDATE trong hệ thống, hãy chạy seed trước', 500);
  }

  const hashedPassword = await hashPassword(password);

  // Tạo User và CandidateProfile trong cùng một transaction
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        roleId: candidateRole.id,
      },
    });

    await tx.candidateProfile.create({
      data: {
        userId: createdUser.id,
        fullName: normalizedFullName,
      },
    });

    return createdUser;
  });

  return { id: user.id, email: user.email, role: candidateRole.name };
}

// Đăng nhập dùng chung cho cả 3 role
async function login({ email, password }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || typeof password !== 'string' || !password) {
    throw createError('Email hoặc mật khẩu không đúng', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { role: true },
  });

  if (!user) {
    throw createError('Email hoặc mật khẩu không đúng', 400);
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw createError('Email hoặc mật khẩu không đúng', 400);
  }

  if (!user.isActive) {
    throw createError('Tài khoản đã bị khóa', 403);
  }

  const token = signToken({ userId: user.id, role: user.role.name });

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role.name },
  };
}

// Thông tin tài khoản đang đăng nhập
async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      candidateProfile: true,
      recruiterProfile: true,
    },
  });

  if (!user) {
    throw createError('Không tìm thấy tài khoản', 404);
  }

  const result = {
    id: user.id,
    email: user.email,
    role: user.role.name,
  };

  if (user.candidateProfile) {
    result.candidateProfile = user.candidateProfile;
  }
  if (user.recruiterProfile) {
    result.recruiterProfile = user.recruiterProfile;
  }

  return result;
}

async function changePassword(userId, { oldPassword, newPassword }) {
  if (typeof oldPassword !== 'string' || !oldPassword) {
    throw createError('Mật khẩu cũ không được để trống', 400);
  }
  if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
    throw createError(`Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`, 400);
  }
  if (newPassword === oldPassword) {
    throw createError('Mật khẩu mới phải khác mật khẩu cũ', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw createError('Không tìm thấy tài khoản', 404);
  }

  const isMatch = await comparePassword(oldPassword, user.password);
  if (!isMatch) {
    throw createError('Mật khẩu cũ không đúng', 400);
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  return { id: user.id, email: user.email };
}

// ===== Quên mật khẩu (chỉ dành cho ứng viên) =====

// Token đặt lại mật khẩu ký bằng JWT_SECRET + mật khẩu đã băm hiện tại:
// đổi mật khẩu xong thì secret đổi theo, token cũ tự mất hiệu lực
function resetSecret(user) {
  return env.JWT_SECRET + user.password;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildResetEmail(fullName, link) {
  const greeting = fullName ? `Xin chào ${fullName},` : 'Xin chào,';

  const text = [
    greeting,
    '',
    'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản ứng viên gắn với email này.',
    'Mở liên kết sau để đặt mật khẩu mới:',
    link,
    '',
    'Liên kết hết hạn sau 15 phút và chỉ dùng được một lần.',
    'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua thư này, mật khẩu hiện tại vẫn giữ nguyên.',
  ].join('\n');

  const html = `
<p>${escapeHtml(greeting)}</p>
<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản ứng viên gắn với email này.</p>
<p><a href="${escapeHtml(link)}">Đặt lại mật khẩu</a></p>
<p>Nếu nút trên không mở được, hãy sao chép liên kết sau vào trình duyệt:<br>${escapeHtml(link)}</p>
<p><strong>Liên kết hết hạn sau 15 phút</strong> và chỉ dùng được một lần.</p>
<p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua thư này, mật khẩu hiện tại vẫn giữ nguyên.</p>`;

  return { subject: 'Hướng dẫn đặt lại mật khẩu', text, html };
}

// Không ném lỗi theo email: controller luôn trả cùng một câu,
// không để lộ email nào có tài khoản
async function forgotPassword({ email }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { role: true, candidateProfile: true },
  });

  // Chỉ gửi cho ứng viên đang hoạt động
  if (!user || user.role.name !== 'CANDIDATE' || !user.isActive) {
    return;
  }

  const token = jwt.sign({ userId: user.id, purpose: RESET_PURPOSE }, resetSecret(user), {
    expiresIn: RESET_TOKEN_EXPIRES_IN,
  });
  const link = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const fullName = user.candidateProfile ? user.candidateProfile.fullName : null;

  // Không chờ gửi xong: thời gian phản hồi như nhau dù email có tài khoản hay không.
  // Gửi lỗi chỉ ghi log, API vẫn trả câu chung.
  sendMail({ to: user.email, ...buildResetEmail(fullName, link) }).catch((err) => {
    console.error(`[MAIL] Gửi thư đặt lại mật khẩu cho userId ${user.id} thất bại: ${err.message}`);
  });
}

async function resetPassword({ token, newPassword }) {
  // Đọc userId chưa kiểm chữ ký, chỉ để lấy mật khẩu đã băm làm secret
  const decoded = typeof token === 'string' ? jwt.decode(token) : null;
  if (!decoded || !Number.isInteger(decoded.userId)) {
    throw createError(INVALID_RESET_LINK, 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { role: true },
  });
  if (!user || user.role.name !== 'CANDIDATE' || !user.isActive) {
    throw createError(INVALID_RESET_LINK, 400);
  }

  let payload;
  try {
    payload = jwt.verify(token, resetSecret(user), { algorithms: ['HS256'] });
  } catch (err) {
    throw createError(INVALID_RESET_LINK, 400);
  }
  if (payload.purpose !== RESET_PURPOSE) {
    throw createError(INVALID_RESET_LINK, 400);
  }

  if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
    throw createError(`Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`, 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  // Chỉ cập nhật khi mật khẩu chưa đổi kể từ lúc verify:
  // hai request dùng cùng một link thì chỉ request đầu thành công
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, password: user.password },
    data: { password: hashedPassword },
  });
  if (count === 0) {
    throw createError(INVALID_RESET_LINK, 400);
  }

  return null;
}

module.exports = { register, login, getMe, changePassword, forgotPassword, resetPassword };
