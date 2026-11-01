require('dotenv').config();

const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');
const { ensureSingleCompany, companySyncMessage } = require('../src/modules/company/company.service');

// Khớp cột Company.name (VarChar 255) và kiểm tra trong src/config/env.js
const COMPANY_NAME_MAX_LENGTH = 255;

const ROLES = [
  { name: 'ADMIN', description: 'Quản trị hệ thống' },
  { name: 'CANDIDATE', description: 'Ứng viên tìm việc' },
  { name: 'RECRUITER', description: 'Nhà tuyển dụng' },
];

// Kỹ năng đa ngành, aliases là chuỗi ngăn cách bởi dấu phẩy
const SKILLS = [
  // Công nghệ thông tin
  { name: 'JavaScript', aliases: 'js,ecmascript,java script' },
  { name: 'TypeScript', aliases: 'ts,type script' },
  { name: 'React', aliases: 'reactjs,react.js' },
  { name: 'Node.js', aliases: 'nodejs,node,express' },
  { name: 'Python', aliases: 'python3,py' },
  { name: 'Java', aliases: 'core java,java se' },
  // SQL khác MySQL, PostgreSQL, SQL Server (quy tắc T14): mỗi hệ quản trị CSDL là Skill riêng,
  // không làm alias của SQL
  { name: 'SQL', aliases: 'truy van sql' },
  { name: 'MySQL', aliases: 'my sql,mysql server' },
  { name: 'PostgreSQL', aliases: 'postgres,postgresql' },
  { name: 'SQL Server', aliases: 'mssql,sql server' },
  { name: 'Docker', aliases: 'container,docker compose' },
  // Marketing
  { name: 'SEO', aliases: 'search engine optimization,toi uu cong cu tim kiem' },
  { name: 'Google Ads', aliases: 'adwords,google adwords,quang cao google' },
  { name: 'Facebook Ads', aliases: 'fb ads,meta ads,quang cao facebook' },
  { name: 'Content Marketing', aliases: 'content,sang tao noi dung,viet content' },
  { name: 'Email Marketing', aliases: 'edm,email campaign' },
  { name: 'Nghiên cứu thị trường', aliases: 'market research,khao sat thi truong' },
  // Kế toán - tài chính
  { name: 'Kế toán tổng hợp', aliases: 'general accounting,ke toan tong hop' },
  { name: 'Báo cáo tài chính', aliases: 'financial report,bctc,lap bao cao tai chinh' },
  { name: 'Thuế', aliases: 'tax,khai thue,quyet toan thue' },
  { name: 'MISA', aliases: 'phan mem misa,misa sme' },
  { name: 'Excel', aliases: 'microsoft excel,ms excel,bang tinh' },
  { name: 'Kiểm toán', aliases: 'audit,kiem toan noi bo' },
  // Nhân sự
  { name: 'Tuyển dụng', aliases: 'recruitment,talent acquisition,headhunt' },
  { name: 'Chấm công tính lương', aliases: 'payroll,c&b,tinh luong' },
  { name: 'Luật lao động', aliases: 'labor law,bo luat lao dong' },
  { name: 'Đào tạo nội bộ', aliases: 'training,l&d,dao tao nhan vien' },
  // Thiết kế
  { name: 'Photoshop', aliases: 'ps,adobe photoshop' },
  // Không dùng alias "ai": trong CV thường là trí tuệ nhân tạo, không phải Illustrator
  { name: 'Illustrator', aliases: 'adobe illustrator' },
  { name: 'Figma', aliases: 'figma design,thiet ke figma' },
  { name: 'UI/UX', aliases: 'ui ux,thiet ke giao dien,user experience' },
  { name: 'Dựng video', aliases: 'premiere,after effect,video editing' },
  // Kỹ thuật
  { name: 'AutoCAD', aliases: 'auto cad,cad,ban ve autocad' },
  { name: 'SolidWorks', aliases: 'solid works,thiet ke 3d' },
  { name: 'Bảo trì máy móc', aliases: 'maintenance,bao tri thiet bi' },
  { name: 'PLC', aliases: 'lap trinh plc,plc siemens' },
  { name: 'Quản lý chất lượng', aliases: 'qa,qc,quality control,iso 9001' },
  { name: 'An toàn lao động', aliases: 'hse,safety,an toan ve sinh lao dong' },
  // Dịch vụ khách hàng
  { name: 'Chăm sóc khách hàng', aliases: 'customer service,cskh,cs' },
  { name: 'Tổng đài', aliases: 'call center,telesales,truc tong dai' },
  { name: 'Xử lý khiếu nại', aliases: 'complaint handling,giai quyet khieu nai' },
  { name: 'Tiếng Anh giao tiếp', aliases: 'english,tieng anh,communication english' },
  // Kỹ năng chung
  { name: 'Quản lý dự án', aliases: 'project management,pm,quan ly du an' },
  { name: 'Làm việc nhóm', aliases: 'teamwork,team work,phoi hop nhom' },
];

// Đọc và kiểm tra biến bắt buộc NGAY ĐẦU script: thiếu thì dừng trước khi ghi bất cứ gì vào DB
function readConfig() {
  const config = {
    companyName: (process.env.COMPANY_NAME || '').trim(),
    adminEmail: (process.env.ADMIN_EMAIL || '').trim(),
    adminPassword: process.env.ADMIN_PASSWORD || '',
  };

  const missing = [];
  if (!config.companyName) missing.push('COMPANY_NAME');
  if (!config.adminEmail) missing.push('ADMIN_EMAIL');
  if (!config.adminPassword) missing.push('ADMIN_PASSWORD');
  if (missing.length > 0) {
    throw new Error(`Thiếu ${missing.join(', ')} trong .env. Seed dừng, chưa ghi gì vào DB.`);
  }
  if (config.companyName.length > COMPANY_NAME_MAX_LENGTH) {
    throw new Error(`COMPANY_NAME dài tối đa ${COMPANY_NAME_MAX_LENGTH} ký tự. Seed dừng, chưa ghi gì vào DB.`);
  }
  return config;
}

async function seedRoles() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }
  console.log(`Đã seed ${ROLES.length} role.`);
}

// Công ty duy nhất theo COMPANY_NAME: dùng chung logic với lúc server khởi động (company.service.js).
// Chưa có thì tạo, khác tên thì đổi tên (id giữ nguyên), gán HR chưa có công ty; có nhiều hơn 1 công ty
// thì chỉ cảnh báo kèm danh sách, KHÔNG tự gộp hay xóa
async function seedCompany(companyName) {
  const result = await ensureSingleCompany(companyName);
  if (result.status !== 'multiple') {
    console.log(companySyncMessage(result));
    return;
  }

  console.warn(companySyncMessage(result));
  const companies = await prisma.company.findMany({
    orderBy: { id: 'asc' },
    include: { _count: { select: { recruiters: true, jobs: true } } },
  });
  for (const company of companies) {
    console.warn(
      `  - id ${company.id}: ${company.name} | ${company._count.recruiters} recruiter | ${company._count.jobs} tin tuyển dụng`
    );
  }
}

// Chỉ tạo admin khi chưa có tài khoản theo ADMIN_EMAIL. Đã có thì KHÔNG đổi mật khẩu, vai trò hay trạng thái
// (mật khẩu admin đổi trên giao diện vẫn giữ sau khi chạy lại seed; quên mật khẩu thì dùng
// scripts/reset-admin-password.js)
async function seedAdmin(adminEmail, adminPassword) {
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { role: { select: { name: true } } },
  });
  if (existing) {
    console.log(`Admin đã tồn tại, bỏ qua: ${adminEmail}`);
    if (existing.role.name !== 'ADMIN') {
      console.warn(`CẢNH BÁO: ${adminEmail} đang là tài khoản ${existing.role.name}, không phải ADMIN. Seed không đổi.`);
    }
    return;
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({ data: { email: adminEmail, password: hashedPassword, roleId: adminRole.id } });
  console.log(`Đã tạo tài khoản admin: ${adminEmail}`);
}

async function seedSkills() {
  for (const skill of SKILLS) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: { aliases: skill.aliases },
      create: skill,
    });
  }
  console.log(`Đã seed ${SKILLS.length} skill.`);
}

// Thứ tự: kiểm tra biến -> roles -> company -> admin -> skills. Mọi bước đều chạy lại được an toàn
// (upsert / chỉ tạo khi chưa có), không bước nào xóa dữ liệu
async function main() {
  const config = readConfig();
  await seedRoles();
  await seedCompany(config.companyName);
  await seedAdmin(config.adminEmail, config.adminPassword);
  await seedSkills();
  console.log('Seed hoàn tất.');
}

main()
  .catch((err) => {
    console.error('Seed thất bại:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
