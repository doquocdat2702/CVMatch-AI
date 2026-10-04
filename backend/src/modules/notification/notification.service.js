const prisma = require('../../config/prisma');

// type lưu dạng String, KHÔNG tạo enum mới; chỉ nhận đúng 2 giá trị này
const NOTIFICATION_TYPES = {
  NEW_APPLICATION: 'NEW_APPLICATION',
  APPLICATION_STATUS_CHANGED: 'APPLICATION_STATUS_CHANGED',
};

// Nhãn tiếng Việt của trạng thái đơn, dùng trong nội dung thông báo
const APPLICATION_STATUS_LABELS = {
  APPLIED: 'Đã nộp',
  REVIEWING: 'Đang xem xét',
  ACCEPTED: 'Đã chấp nhận',
  REJECTED: 'Đã từ chối',
};

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function parseId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError(`${label} không hợp lệ`, 400);
  }
  return id;
}

function toText(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

// ===== Nội dung thông báo sinh sẵn =====

// "Ứng viên Nguyễn Văn A vừa ứng tuyển vị trí Kế toán tổng hợp"
function buildNewApplicationMessage({ candidateName, jobTitle } = {}) {
  return `Ứng viên ${toText(candidateName)} vừa ứng tuyển vị trí ${toText(jobTitle)}`;
}

// "Đơn ứng tuyển Kế toán tổng hợp chuyển sang Đang xem xét"
function buildStatusChangedMessage({ jobTitle, status } = {}) {
  const label = APPLICATION_STATUS_LABELS[status] || toText(status);
  return `Đơn ứng tuyển ${toText(jobTitle)} chuyển sang ${label}`;
}

// ===== Tạo thông báo (dành cho module khác gọi) =====

// createNotification({ userId, type, message, applicationId }) -> Notification | null
// KHÔNG BAO GIỜ throw: dữ liệu sai hoặc lỗi DB chỉ ghi log và trả null,
// để việc tạo thông báo hỏng không làm hỏng thao tác chính (ứng tuyển, đổi trạng thái...).
async function createNotification(input) {
  const { userId, type, message, applicationId } = input || {};

  try {
    const ownerId = Number(userId);
    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      throw new Error('userId không hợp lệ');
    }
    if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
      throw new Error(`type không hợp lệ: ${type}`);
    }

    const text = typeof message === 'string' ? message.trim() : '';
    if (!text) {
      throw new Error('message không được để trống');
    }

    let linkedApplicationId = null;
    if (applicationId !== undefined && applicationId !== null) {
      linkedApplicationId = Number(applicationId);
      if (!Number.isInteger(linkedApplicationId) || linkedApplicationId <= 0) {
        throw new Error('applicationId không hợp lệ');
      }
    }

    return await prisma.notification.create({
      data: {
        userId: ownerId,
        type,
        message: text,
        applicationId: linkedApplicationId,
      },
    });
  } catch (err) {
    // Lỗi Prisma in nhiều dòng kèm trích code, chỉ giữ mã lỗi và dòng nguyên nhân cuối
    const lines = String(err.message || '').split('\n').map((line) => line.trim()).filter(Boolean);
    const reason = err.code ? `${err.code} ${lines[lines.length - 1] || ''}` : lines.join(' ');
    console.error(
      `[NOTIFICATION] Bỏ qua, không tạo được thông báo ${type} cho user ${userId}: ${reason}`
    );
    return null;
  }
}

// ===== Đọc thông báo của chính mình =====

// Mới nhất trước, phân trang page / limit (mặc định 1 / 10)
async function listMyNotifications(userId, { page, limit } = {}) {
  let currentPage = Number(page);
  if (!Number.isInteger(currentPage) || currentPage <= 0) {
    currentPage = 1;
  }

  let pageSize = Number(limit);
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    pageSize = 10;
  }

  const where = { userId };

  const [total, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      // Cùng thời điểm tạo thì id lớn hơn là mới hơn
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

async function countUnread(userId) {
  const count = await prisma.notification.count({ where: { userId, isRead: false } });
  return { count };
}

async function markAsRead(userId, notificationId) {
  const id = parseId(notificationId, 'Mã thông báo');

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    throw createError('Không tìm thấy thông báo', 404);
  }
  if (notification.userId !== userId) {
    throw createError('Bạn không có quyền với thông báo này', 403);
  }

  // Đã đọc rồi thì trả nguyên trạng, không cần ghi lại
  if (notification.isRead) {
    return notification;
  }

  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

async function markAllAsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { count: result.count };
}

module.exports = {
  NOTIFICATION_TYPES,
  APPLICATION_STATUS_LABELS,
  buildNewApplicationMessage,
  buildStatusChangedMessage,
  createNotification,
  listMyNotifications,
  countUnread,
  markAsRead,
  markAllAsRead,
};
