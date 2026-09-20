const prisma = require('../../config/prisma');
const { hashPassword, comparePassword } = require('../../utils/hash');
const { signToken } = require('../../utils/jwt');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

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

module.exports = { register, login };
