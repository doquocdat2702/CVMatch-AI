require('dotenv').config();

const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');

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
  { name: 'SQL', aliases: 'mysql,postgresql,sql server,truy van sql' },
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
  { name: 'Illustrator', aliases: 'ai,adobe illustrator' },
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

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD trong .env. Hãy bổ sung trước khi chạy seed.'
    );
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, isActive: true, roleId: adminRole.id },
    create: { email, password: hashedPassword, roleId: adminRole.id },
  });
  console.log(`Đã seed tài khoản admin: ${email}`);
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

async function main() {
  await seedRoles();
  await seedAdmin();
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
