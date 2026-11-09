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

// Kỹ năng đa ngành, aliases là chuỗi ngăn cách bởi dấu phẩy, nhóm theo phòng ban của công ty.
// Quy tắc alias (bóc kỹ năng bằng từ điển so NGUYÊN CỤM sau khi bỏ dấu, chữ thường):
//   - Khóa dưới 3 ký tự (js, ts, qa, ba...) chỉ khớp khi CV viết HOA và đứng riêng (rule.parser.js).
//   - Không dùng từ đơn lẻ dễ khớp nhầm: "go", "ads", "test", "tester", "kiem thu", "api", "rest", "next",
//     "network", "spring", "b2b", "ml", "xd", "ai"...
//   - Một khóa chỉ thuộc một Skill; tên trùng name / alias của Skill khác thì không thêm Skill mới.
// Mỗi hệ quản trị CSDL là Skill riêng, không làm alias của SQL (quy tắc T14).
// Upsert theo name: chạy lại seed không tạo trùng, chỉ đặt lại aliases của các Skill có trong danh sách.
const SKILLS = [
  // ===== Phát triển phần mềm =====
  { name: 'JavaScript', aliases: 'js,ecmascript,java script' },
  { name: 'TypeScript', aliases: 'ts,type script' },
  { name: 'React', aliases: 'reactjs,react.js' },
  { name: 'Node.js', aliases: 'nodejs,node,express,node js' },
  { name: 'Python', aliases: 'python3,py' },
  { name: 'Java', aliases: 'core java,java se' },
  { name: 'Spring Boot', aliases: 'springboot,spring-boot,spring framework' },
  { name: 'C#', aliases: 'c sharp,csharp' },
  // Không dùng alias "c" đơn lẻ (một chữ cái, khớp nhầm khắp nơi)
  { name: 'C/C++', aliases: 'c++,cpp,c/c++' },
  { name: '.NET', aliases: 'dotnet,dot net,asp.net,aspnet,asp.net core,.net core' },
  { name: 'PHP', aliases: 'php7,php8' },
  { name: 'Laravel', aliases: 'laravel framework' },
  // "go" viết thường là động từ tiếng Anh: chỉ khớp "Golang", "go lang" hoặc "GO" viết HOA đứng riêng
  { name: 'Go', aliases: 'golang,go lang' },
  { name: 'Angular', aliases: 'angularjs,angular js' },
  { name: 'Vue.js', aliases: 'vuejs,vue,vue js' },
  { name: 'Next.js', aliases: 'nextjs,next js' },
  { name: 'HTML', aliases: 'html5' },
  { name: 'CSS', aliases: 'css3' },
  { name: 'REST API', aliases: 'restful api,restful,rest apis,restful apis' },
  { name: 'GraphQL', aliases: 'graph ql' },
  { name: 'Git', aliases: 'github,gitlab,quan ly ma nguon git' },
  { name: 'Microservices', aliases: 'microservice,micro service,micro services,kien truc microservices' },
  { name: 'SQL', aliases: 'truy van sql' },
  { name: 'MySQL', aliases: 'my sql,mysql server' },
  { name: 'PostgreSQL', aliases: 'postgres,postgresql' },
  { name: 'SQL Server', aliases: 'mssql,sql server' },

  // ===== Ứng dụng di động =====
  { name: 'Flutter', aliases: 'lap trinh flutter' },
  { name: 'React Native', aliases: 'react-native,reactnative' },
  { name: 'Kotlin', aliases: 'lap trinh kotlin' },
  { name: 'Swift', aliases: 'swiftui,swift ui' },
  { name: 'Android', aliases: 'android sdk,lap trinh android' },
  { name: 'iOS', aliases: 'lap trinh ios' },

  // ===== Kiểm thử =====
  { name: 'Manual Testing', aliases: 'manual test,kiem thu thu cong,test thu cong' },
  { name: 'Automation Testing', aliases: 'automation test,test automation,automated testing,kiem thu tu dong' },
  { name: 'Selenium', aliases: 'selenium webdriver' },
  { name: 'Postman', aliases: '' },
  { name: 'JMeter', aliases: 'apache jmeter' },
  { name: 'Test Case', aliases: 'test cases,testcase,viet test case,kich ban kiem thu' },
  { name: 'Jira', aliases: 'atlassian jira' },

  // ===== DevOps, hạ tầng =====
  { name: 'Docker', aliases: 'container,docker compose' },
  { name: 'Kubernetes', aliases: 'k8s' },
  { name: 'Linux', aliases: 'ubuntu,centos,linux server' },
  { name: 'AWS', aliases: 'amazon web services' },
  { name: 'Azure', aliases: 'microsoft azure' },
  { name: 'Google Cloud', aliases: 'gcp,google cloud platform' },
  { name: 'CI/CD', aliases: 'ci cd,cicd,ci/cd pipeline' },
  { name: 'Jenkins', aliases: 'jenkins pipeline' },
  { name: 'Nginx', aliases: '' },
  { name: 'Terraform', aliases: '' },

  // ===== Dữ liệu và AI =====
  { name: 'Power BI', aliases: 'powerbi' },
  { name: 'Tableau', aliases: '' },
  { name: 'Pandas', aliases: 'thu vien pandas' },
  // Không dùng "ai", "ml": trong CV thường là chữ khác (trí tuệ nhân tạo nói chung, mililit...)
  { name: 'Machine Learning', aliases: 'machine-learning,hoc may' },
  { name: 'Data Analysis', aliases: 'data analytics,phan tich du lieu' },
  { name: 'ETL', aliases: 'etl pipeline' },
  { name: 'MongoDB', aliases: 'mongo,mongo db' },
  { name: 'Redis', aliases: 'redis cache' },

  // ===== Sản phẩm, phân tích nghiệp vụ =====
  { name: 'Business Analysis', aliases: 'ba,business analyst,phan tich nghiep vu' },
  { name: 'Product Management', aliases: 'product manager,quan ly san pham' },
  { name: 'Agile', aliases: 'agile methodology,phuong phap agile' },
  { name: 'Scrum', aliases: 'scrum master' },
  { name: 'User Story', aliases: 'user stories,viet user story' },
  { name: 'UML', aliases: 'so do uml' },
  { name: 'BPMN', aliases: '' },
  { name: 'Nghiên cứu thị trường', aliases: 'market research,khao sat thi truong' },

  // ===== Thiết kế UI/UX =====
  { name: 'Figma', aliases: 'figma design,thiet ke figma' },
  { name: 'Adobe XD', aliases: 'adobexd' },
  { name: 'Photoshop', aliases: 'ps,adobe photoshop' },
  // Không dùng alias "ai": trong CV thường là trí tuệ nhân tạo, không phải Illustrator
  { name: 'Illustrator', aliases: 'adobe illustrator' },
  { name: 'UI/UX', aliases: 'ui ux,ui/ux design,thiet ke giao dien,user experience' },
  { name: 'UI Design', aliases: 'ui designer' },
  { name: 'UX Research', aliases: 'user research,ux researcher,nghien cuu nguoi dung' },
  { name: 'Wireframe', aliases: 'wireframes,wireframing' },
  { name: 'Prototype', aliases: 'prototyping,prototypes' },
  { name: 'Dựng video', aliases: 'premiere,after effect,video editing' },

  // ===== Quản lý dự án =====
  // "Project Management" đã là alias của Quản lý dự án nên không thêm Skill riêng
  { name: 'Quản lý dự án', aliases: 'project management,pm,quan ly du an' },
  { name: 'PMP', aliases: 'chung chi pmp' },
  { name: 'Kanban', aliases: '' },
  { name: 'MS Project', aliases: 'microsoft project' },
  { name: 'Risk Management', aliases: 'quan ly rui ro,quan tri rui ro' },

  // ===== IT nội bộ, bảo mật =====
  { name: 'System Administration', aliases: 'system admin,sysadmin,quan tri he thong' },
  { name: 'Networking', aliases: 'computer networking,quan tri mang,mang may tinh,ccna,tcp/ip' },
  { name: 'Windows Server', aliases: 'win server' },
  { name: 'Active Directory', aliases: 'microsoft active directory' },
  {
    name: 'Information Security',
    aliases: 'an toan thong tin,bao mat thong tin,cyber security,cybersecurity,an ninh mang',
  },
  { name: 'ISO 27001', aliases: 'iso/iec 27001,iso27001' },

  // ===== Kinh doanh =====
  { name: 'B2B Sales', aliases: 'ban hang b2b,kinh doanh b2b' },
  { name: 'Presales', aliases: 'pre-sales,pre sales' },
  { name: 'CRM', aliases: 'quan ly quan he khach hang' },
  { name: 'Salesforce', aliases: 'salesforce crm' },
  { name: 'Account Management', aliases: 'account manager,key account,key account management' },
  { name: 'Đàm phán', aliases: 'negotiation,ky nang dam phan' },

  // ===== Chăm sóc khách hàng =====
  // "Customer Support" đã là alias của Chăm sóc khách hàng trong skill.dictionary.json:
  // không thêm Skill riêng, chỉ thêm alias cho bảng Skill khớp với từ điển
  { name: 'Chăm sóc khách hàng', aliases: 'customer service,cskh,cs,customer support' },
  { name: 'Customer Success', aliases: 'customer success manager' },
  { name: 'Helpdesk', aliases: 'help desk,it helpdesk,service desk' },
  { name: 'Zendesk', aliases: '' },
  { name: 'Tổng đài', aliases: 'call center,telesales,truc tong dai' },
  { name: 'Xử lý khiếu nại', aliases: 'complaint handling,giai quyet khieu nai' },

  // ===== Marketing =====
  { name: 'Digital Marketing', aliases: 'online marketing,marketing online,tiep thi so' },
  { name: 'SEO', aliases: 'search engine optimization,toi uu cong cu tim kiem' },
  { name: 'Google Ads', aliases: 'adwords,google adwords,quang cao google' },
  { name: 'Facebook Ads', aliases: 'fb ads,meta ads,quang cao facebook' },
  { name: 'Content Marketing', aliases: 'content,sang tao noi dung,viet content' },
  { name: 'Google Analytics', aliases: 'ga4,google analytic' },
  { name: 'Email Marketing', aliases: 'edm,email campaign' },

  // ===== Nhân sự =====
  { name: 'Tuyển dụng', aliases: 'recruitment,talent acquisition,headhunt' },
  // "C&B" đã là alias của Chấm công tính lương nên không thêm Skill riêng
  { name: 'Chấm công tính lương', aliases: 'payroll,c&b,tinh luong' },
  { name: 'Đào tạo nội bộ', aliases: 'training,l&d,dao tao nhan vien' },
  { name: 'Luật lao động', aliases: 'labor law,bo luat lao dong' },
  { name: 'Employer Branding', aliases: 'employer brand,thuong hieu tuyen dung' },

  // ===== Kế toán, tài chính =====
  { name: 'Kế toán tổng hợp', aliases: 'general accounting,ke toan tong hop' },
  // "thue" là tên của Skill Thuế nên Kế toán thuế không lấy làm alias
  { name: 'Kế toán thuế', aliases: 'tax accounting' },
  { name: 'Thuế', aliases: 'tax,khai thue,quyet toan thue' },
  { name: 'MISA', aliases: 'phan mem misa,misa sme' },
  { name: 'Báo cáo tài chính', aliases: 'financial report,bctc,lap bao cao tai chinh' },
  { name: 'Phân tích tài chính', aliases: 'financial analysis,financial analyst' },
  { name: 'Excel', aliases: 'microsoft excel,ms excel,bang tinh' },
  { name: 'Kiểm toán', aliases: 'audit,kiem toan noi bo' },

  // ===== Hành chính, pháp chế =====
  { name: 'Hành chính văn phòng', aliases: 'office administration,office admin' },
  { name: 'Soạn thảo hợp đồng', aliases: 'contract drafting,soan hop dong' },
  { name: 'Quản lý hồ sơ', aliases: 'document management,luu tru ho so,quan ly tai lieu' },

  // ===== Ngoại ngữ =====
  // "Tiếng Anh" đã là alias của Tiếng Anh giao tiếp nên không thêm Skill riêng
  { name: 'Tiếng Anh giao tiếp', aliases: 'english,tieng anh,communication english' },
  { name: 'IELTS', aliases: '' },
  { name: 'TOEIC', aliases: '' },
  { name: 'Tiếng Nhật', aliases: 'japanese,tieng nhat ban,nihongo' },
  { name: 'JLPT', aliases: '' },

  // ===== Có từ trước, giữ để hồ sơ và tin cũ không mất liên kết Skill =====
  // Kỹ thuật, sản xuất
  { name: 'AutoCAD', aliases: 'auto cad,cad,ban ve autocad' },
  { name: 'SolidWorks', aliases: 'solid works,thiet ke 3d' },
  { name: 'Bảo trì máy móc', aliases: 'maintenance,bao tri thiet bi' },
  { name: 'PLC', aliases: 'lap trinh plc,plc siemens' },
  { name: 'Quản lý chất lượng', aliases: 'qa,qc,quality control,iso 9001' },
  { name: 'An toàn lao động', aliases: 'hse,safety,an toan ve sinh lao dong' },
  // Kỹ năng chung
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
