const prisma = require('../../config/prisma');

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Công ty mà nhà tuyển dụng đang thuộc về
async function getMyCompany(userId) {
  const profile = await prisma.recruiterProfile.findUnique({
    where: { userId },
    include: { company: true },
  });

  if (!profile) {
    throw createError('Không tìm thấy thông tin nhà tuyển dụng.', 404);
  }
  if (!profile.company) {
    throw createError('Tài khoản chưa được gán vào công ty. Vui lòng liên hệ quản trị viên.', 404);
  }

  return profile.company;
}

// Nhà tuyển dụng chỉ sửa được công ty mình thuộc về.
// Tên công ty cố định theo COMPANY_NAME (G7): trường name client gửi lên bị bỏ qua, không báo lỗi
async function updateMyCompany(userId, { description, address, website }) {
  const company = await getMyCompany(userId);
  const data = {};

  if (description !== undefined) {
    data.description =
      typeof description === 'string' && description.trim() ? description.trim() : null;
  }
  if (address !== undefined) {
    data.address = typeof address === 'string' && address.trim() ? address.trim() : null;
  }
  if (website !== undefined) {
    data.website = typeof website === 'string' && website.trim() ? website.trim() : null;
  }

  if (Object.keys(data).length === 0) {
    throw createError('Chưa có thay đổi nào để lưu.', 400);
  }

  return prisma.company.update({ where: { id: company.id }, data });
}

// Xem công khai, không cần đăng nhập
async function getCompanyById(companyId) {
  const id = Number(companyId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError('Mã công ty không hợp lệ.', 400);
  }

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) {
    throw createError('Không tìm thấy công ty.', 404);
  }

  return company;
}

// Công ty duy nhất của hệ thống, xem công khai (trang Giới thiệu, Liên hệ): không cần biết mã công ty.
// DB lỡ có nhiều hơn 1 công ty (dữ liệu cũ) thì dùng công ty tạo sớm nhất, giống admin.service.
// Chỉ trả các trường hiển thị, không trả id
async function getPublicCompany() {
  const company = await prisma.company.findFirst({
    orderBy: { id: 'asc' },
    select: { name: true, description: true, address: true, website: true },
  });
  if (!company) {
    throw createError('Chưa có thông tin công ty.', 404);
  }

  return company;
}

// ===== Công ty duy nhất, tên cố định theo COMPANY_NAME (G7) =====

// Đồng bộ bảng Company với COMPANY_NAME. client là prisma hoặc transaction.
// Idempotent: chạy lại nhiều lần không đổi gì thêm.
//   - Chưa có công ty: tạo 1 công ty tên COMPANY_NAME
//   - Có đúng 1 công ty: tên khác COMPANY_NAME thì đổi tên (id và các trường khác giữ nguyên),
//     rồi gán mọi HR chưa có công ty hợp lệ (companyId null hoặc trỏ công ty đã mất) vào công ty này
//   - Có nhiều hơn 1 công ty: KHÔNG sửa gì (không tự xóa, gộp hay gán HR), để nơi gọi cảnh báo
// Trả về { status: 'created' | 'renamed' | 'unchanged' | 'multiple', company, companyCount, assignedRecruiters }
async function syncSingleCompany(client, companyName) {
  const name = typeof companyName === 'string' ? companyName.trim() : '';
  if (!name) {
    throw new Error('Thiếu COMPANY_NAME, không đồng bộ được công ty');
  }

  const companies = await client.company.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, name: true },
  });

  if (companies.length > 1) {
    return { status: 'multiple', company: null, companyCount: companies.length, assignedRecruiters: 0 };
  }

  let status = 'unchanged';
  let company = companies[0];
  if (!company) {
    company = await client.company.create({ data: { name }, select: { id: true, name: true } });
    status = 'created';
  } else if (company.name !== name) {
    company = await client.company.update({
      where: { id: company.id },
      data: { name },
      select: { id: true, name: true },
    });
    status = 'renamed';
  }

  // Gán HR chưa có công ty hợp lệ: companyId null hoặc trỏ tới công ty không còn tồn tại.
  // Schema khai báo companyId bắt buộc (NOT NULL + khóa ngoại) nên Prisma không cho lọc "companyId: null";
  // dùng SQL có tham số để vẫn sửa được DB lệch schema (dữ liệu cũ). DB đúng schema thì cập nhật 0 dòng
  const assignedRecruiters = await client.$executeRaw`
    UPDATE RecruiterProfile SET companyId = ${company.id}
    WHERE companyId IS NULL OR companyId NOT IN (SELECT id FROM Company)
  `;

  return { status, company, companyCount: 1, assignedRecruiters: Number(assignedRecruiters) };
}

// Chạy khi server khởi động và trong seed. Gói trong một transaction để đọc - tạo / đổi tên - gán HR
// là một khối, không lẫn với lần chạy khác cùng lúc
async function ensureSingleCompany(companyName) {
  return prisma.$transaction((tx) => syncSingleCompany(tx, companyName));
}

// Một dòng log tóm tắt kết quả (chỉ tên công ty và số HR, không có dữ liệu nhạy cảm)
function companySyncMessage(result) {
  if (result.status === 'multiple') {
    return (
      `CẢNH BÁO: DB đang có ${result.companyCount} công ty, hệ thống chỉ dùng một công ty. ` +
      'Không tự sửa, gộp, xóa hay gán HR; hãy xử lý thủ công.'
    );
  }
  return `Công ty: ${result.company.name} | Đã gán ${result.assignedRecruiters} HR chưa có công ty`;
}

module.exports = {
  getMyCompany,
  updateMyCompany,
  getCompanyById,
  getPublicCompany,
  syncSingleCompany,
  ensureSingleCompany,
  companySyncMessage,
};
