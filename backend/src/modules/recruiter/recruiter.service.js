const { ApplicationStatus } = require('@prisma/client');
const prisma = require('../../config/prisma');
const { COVERAGE_NOTE } = require('../ai/matching/coverage');
const { dayKey, startOfDayAgo, lastNDays, countByPeriod, countByEnum } = require('../../utils/stats');

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const DASHBOARD_SCOPES = ['mine', 'all'];

// Coverage lưu dạng 0..100, có thể lẻ (33.3) nên chia theo cận trên:
// "21-40" nghĩa là 20 < coverage <= 40
const COVERAGE_RANGES = [
  { range: '0-20', filter: { lte: 20 } },
  { range: '21-40', filter: { gt: 20, lte: 40 } },
  { range: '41-60', filter: { gt: 40, lte: 60 } },
  { range: '61-80', filter: { gt: 60, lte: 80 } },
  { range: '81-100', filter: { gt: 80 } },
];

async function getMyProfile(userId) {
  const profile = await prisma.recruiterProfile.findUnique({
    where: { userId },
    include: { company: true },
  });

  if (!profile) {
    throw createError('Không tìm thấy hồ sơ nhà tuyển dụng', 404);
  }

  return profile;
}

// Chỉ cho sửa thông tin cá nhân, companyId do Admin gán khi tạo tài khoản
async function updateMyProfile(userId, { fullName, phone, position }) {
  const profile = await prisma.recruiterProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw createError('Không tìm thấy hồ sơ nhà tuyển dụng', 404);
  }

  const data = {};

  if (fullName !== undefined) {
    const value = typeof fullName === 'string' ? fullName.trim() : '';
    if (!value) {
      throw createError('Họ tên không được để trống', 400);
    }
    data.fullName = value;
  }
  if (phone !== undefined) {
    data.phone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
  }
  if (position !== undefined) {
    data.position = typeof position === 'string' && position.trim() ? position.trim() : null;
  }

  if (Object.keys(data).length === 0) {
    throw createError('Không có thông tin nào để cập nhật', 400);
  }

  return prisma.recruiterProfile.update({
    where: { id: profile.id },
    data,
    include: { company: true },
  });
}

// ===== Trang Tổng quan của HR =====

// scope = mine: job do mình đăng; all: toàn công ty. Chỉ dùng count / groupBy.
async function getDashboard(userId, { scope } = {}) {
  const selectedScope =
    scope === undefined || scope === '' ? 'mine' : String(scope).trim().toLowerCase();
  if (!DASHBOARD_SCOPES.includes(selectedScope)) {
    throw createError('scope phải là mine hoặc all', 400);
  }

  const profile = await prisma.recruiterProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw createError('Không tìm thấy hồ sơ nhà tuyển dụng', 404);
  }

  const jobWhere =
    selectedScope === 'mine' ? { recruiterProfileId: profile.id } : { companyId: profile.companyId };
  const applicationWhere = { job: jobWhere };

  // 30 ngày gần nhất tính cả hôm nay; "7 ngày" cũng tính theo ngày để khớp với biểu đồ
  const days = lastNDays(30);
  const last7DaysStart = startOfDayAgo(6);

  const [openJobs, totalApplications, newApplicationsLast7Days, statusGroups, dayGroups, coverageCounts] =
    await Promise.all([
      prisma.job.count({ where: { ...jobWhere, isOpen: true } }),
      prisma.application.count({ where: applicationWhere }),
      prisma.application.count({ where: { ...applicationWhere, appliedAt: { gte: last7DaysStart } } }),
      prisma.application.groupBy({ by: ['status'], where: applicationWhere, _count: { _all: true } }),
      prisma.application.groupBy({
        by: ['appliedAt'],
        where: { ...applicationWhere, appliedAt: { gte: days.start } },
        _count: { _all: true },
      }),
      // Coverage lúc nộp; null (job chưa phân tích JD) không lọt vào khoảng nào
      Promise.all(
        COVERAGE_RANGES.map(({ filter }) =>
          prisma.application.count({ where: { ...applicationWhere, coverage: filter } })
        )
      ),
    ]);

  return {
    scope: selectedScope,
    summary: { openJobs, totalApplications, newApplicationsLast7Days },
    applicationsByStatus: countByEnum(statusGroups, 'status', Object.values(ApplicationStatus)),
    applicationsByDay: countByPeriod(dayGroups, 'appliedAt', dayKey, days.keys).map(({ key, count }) => ({
      date: key,
      count,
    })),
    coverageDistribution: COVERAGE_RANGES.map(({ range }, index) => ({ range, count: coverageCounts[index] })),
    note: COVERAGE_NOTE,
  };
}

module.exports = { getMyProfile, updateMyProfile, getDashboard };
