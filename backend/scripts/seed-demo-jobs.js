// Tạo tin tuyển dụng mẫu theo các phòng ban của công ty (D1, cập nhật ở Task F) để xem giao diện,
// thử phân trang và đối chiếu: 15 tin mở + 2 tin đã đóng, kỹ năng trong JD dùng tên / alias của prisma/seed.js.
//
// Cách chạy (thư mục backend):
//   npm run seed:demo-jobs -- --recruiter=<email HR>                        (DB theo backend/.env)
//   node --env-file=.env.test scripts/seed-demo-jobs.js --recruiter=<email>  (DB test)
//   Thêm --remove: xóa CHỈ các tin mẫu (đúng danh sách tiêu đề dưới đây, kể cả tiêu đề tin mẫu của bản trước,
//   đúng HR) chưa có đơn ứng tuyển, có in danh sách và hỏi xác nhận y/N trước khi xóa.
//
// - Tin gán cho HR có email đó: phải là RECRUITER, đang hoạt động, đã có công ty.
// - Chạy lại không tạo trùng: tin mẫu nhận diện bằng (tiêu đề + HR), đã có thì bỏ qua.
// - Tạo xong mỗi tin thì phân tích JD bằng service có sẵn ở chế độ rule (KHÔNG gọi Gemini).
// - Chỉ dùng các trường có trong model Job: title, description, location, isOpen, createdAt.
//   Nội dung hư cấu, không có tên người, email hay số điện thoại thật.
// - Không in giá trị bí mật (chuỗi kết nối, mật khẩu); chỉ in tên database.

// Ép chế độ rule TRƯỚC khi nạp src/config/env.js: dotenv không ghi đè biến đã có,
// nên dù .env đặt NLP_MODE=hybrid thì script vẫn phân tích JD bằng rule
process.env.NLP_MODE = 'rule';

const readline = require('readline');
const prisma = require('../src/config/prisma');
const { parseJobDescription } = require('../src/modules/job/job.requirement.service');

// ===== Dữ liệu mẫu =====
// Dòng mô tả công việc viết thành câu dài liền mạch (không dấu phẩy, không "/", không "và", "hoặc"): bộ tách yêu cầu
// bỏ câu dài hơn 12 từ, nên phần mô tả không sinh yêu cầu rác. Dòng yêu cầu dùng đúng tên kỹ năng trong seed.
// daysAgo: tin đăng cách đây bao nhiêu ngày (rải trong 30 ngày để thứ tự hiển thị trông tự nhiên).

function jd({ duties, required, preferred, benefits }) {
  return [
    'Mô tả công việc',
    ...duties.map((line) => `- ${line}`),
    '',
    'Yêu cầu ứng viên',
    ...required.map((line) => `- ${line}`),
    '',
    'Ưu tiên',
    ...preferred.map((line) => `- ${line}`),
    '',
    'Quyền lợi',
    ...benefits.map((line) => `- ${line}`),
  ].join('\n');
}

const COMMON_BENEFITS = [
  'Đóng bảo hiểm xã hội đầy đủ theo quy định, khám sức khỏe định kỳ hằng năm',
  'Thưởng tháng 13, du lịch công ty mỗi năm',
  'Làm việc từ thứ Hai đến thứ Sáu, 12 ngày phép năm',
];

// Tin theo các phòng ban của công ty (Task F, khớp nhóm Skill trong prisma/seed.js): 15 tin mở + 2 tin đã đóng.
// Dòng yêu cầu dùng đúng tên / alias có trong seed. Cụm có "/" chỉ giữ nguyên khi cả cụm là tên một Skill (F5:
// CI/CD, UI/UX); "Excel/Word" vẫn tách thành 2 yêu cầu.
const DEMO_JOBS = [
  // ===== Phát triển phần mềm =====
  {
    title: 'Lập trình viên Backend (Node.js)',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 1,
    isOpen: true,
    description: jd({
      duties: [
        'Xây dựng các API phục vụ hệ thống quản lý bán hàng nội bộ của công ty trên nền tảng Node.js',
        'Phối hợp với nhóm giao diện để tích hợp chức năng mới theo kế hoạch phát triển của từng quý',
        'Theo dõi hiệu năng của hệ thống trên môi trường thật để kịp thời xử lý các lỗi phát sinh',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm làm việc với Node.js',
        'Thành thạo JavaScript, TypeScript',
        'Yêu cầu sử dụng tốt MySQL, PostgreSQL',
        'Bắt buộc sử dụng tốt REST API, Git',
      ],
      preferred: ['Ưu tiên ứng viên biết Docker, Redis', 'Biết thêm Microservices là lợi thế'],
      benefits: ['Thu nhập 20 – 30 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Lập trình viên Frontend (React)',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 2,
    isOpen: true,
    description: jd({
      duties: [
        'Phát triển giao diện cho các ứng dụng web nội bộ của công ty dựa trên bản thiết kế được duyệt',
        'Tối ưu tốc độ tải trang cùng trải nghiệm người dùng trên cả máy tính lẫn điện thoại di động',
        'Viết tài liệu hướng dẫn sử dụng thành phần giao diện dùng chung cho các thành viên khác trong nhóm',
      ],
      required: [
        'Tối thiểu 1 năm kinh nghiệm với React',
        'Thành thạo HTML, CSS, JavaScript',
        'Yêu cầu sử dụng tốt TypeScript',
        'Bắt buộc biết sử dụng Git',
      ],
      preferred: ['Ưu tiên ứng viên biết Next.js', 'Biết thêm Figma là lợi thế'],
      benefits: ['Thu nhập 15 – 25 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },

  // ===== Ứng dụng di động =====
  {
    title: 'Lập trình viên Mobile (Flutter)',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 3,
    isOpen: true,
    description: jd({
      duties: [
        'Phát triển ứng dụng di động cho khách hàng của công ty trên cả hai nền tảng phổ biến hiện nay',
        'Kết nối ứng dụng với hệ thống máy chủ thông qua các API do nhóm backend cung cấp sẵn',
        'Đưa ứng dụng lên cửa hàng ứng dụng theo đúng quy trình kiểm duyệt của từng nền tảng',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm với Flutter',
        'Thành thạo Android, iOS',
        'Yêu cầu hiểu biết REST API, Git',
      ],
      preferred: ['Ưu tiên ứng viên biết Kotlin, Swift', 'Biết thêm React Native là lợi thế'],
      benefits: ['Thu nhập 18 – 28 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },

  // ===== Kiểm thử =====
  {
    title: 'Chuyên viên Kiểm thử phần mềm (Tester)',
    location: 'Hà Nội',
    daysAgo: 4,
    isOpen: true,
    description: jd({
      duties: [
        'Kiểm thử chức năng của các phần mềm nội bộ trước mỗi lần phát hành phiên bản mới cho người dùng',
        'Ghi nhận lỗi lên hệ thống quản lý công việc rồi theo dõi cho tới khi lỗi được xử lý xong',
        'Phối hợp với lập trình viên để tái hiện lỗi khó trên môi trường kiểm thử của công ty',
      ],
      required: [
        'Tối thiểu 1 năm kinh nghiệm kiểm thử thủ công',
        'Thành thạo viết Test Case',
        'Yêu cầu sử dụng tốt Jira, Postman',
      ],
      preferred: ['Ưu tiên ứng viên biết Automation Testing, Selenium', 'Biết thêm JMeter là lợi thế'],
      benefits: ['Thu nhập 12 – 20 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },

  // ===== DevOps, hạ tầng =====
  {
    title: 'Kỹ sư DevOps',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 5,
    isOpen: true,
    description: jd({
      duties: [
        'Vận hành hạ tầng máy chủ của các sản phẩm phần mềm do công ty phát triển trên nền tảng đám mây',
        'Xây dựng quy trình tích hợp liên tục giúp nhóm phát triển đưa phiên bản mới lên môi trường thật an toàn hơn',
        'Giám sát tài nguyên máy chủ để cảnh báo sớm khi hệ thống có dấu hiệu quá tải',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm với Linux',
        'Thành thạo Docker, Kubernetes',
        'Yêu cầu sử dụng tốt CI/CD, Jenkins, Git',
      ],
      preferred: ['Ưu tiên ứng viên có kinh nghiệm AWS, Terraform', 'Biết thêm Nginx là lợi thế'],
      benefits: ['Thu nhập 25 – 35 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },

  // ===== Dữ liệu và AI =====
  {
    title: 'Chuyên viên Phân tích dữ liệu',
    location: 'Hà Nội',
    daysAgo: 6,
    isOpen: true,
    description: jd({
      duties: [
        'Tổng hợp số liệu kinh doanh hằng tuần từ các hệ thống nội bộ để phục vụ ban giám đốc ra quyết định',
        'Xây dựng báo cáo trực quan theo dõi doanh thu của từng chi nhánh trên toàn quốc',
        'Phối hợp với các phòng ban để làm rõ nhu cầu số liệu trước khi bắt đầu phân tích',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm phân tích dữ liệu',
        'Thành thạo SQL, Power BI',
        'Yêu cầu sử dụng tốt Python, Pandas',
      ],
      preferred: ['Ưu tiên ứng viên biết Tableau', 'Biết thêm Machine Learning là lợi thế'],
      benefits: ['Thu nhập 18 – 28 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },

  // ===== Sản phẩm, phân tích nghiệp vụ =====
  {
    title: 'Chuyên viên Phân tích nghiệp vụ (BA)',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 7,
    isOpen: true,
    description: jd({
      duties: [
        'Làm việc với các phòng ban để thu thập nhu cầu trước khi nhóm phát triển xây dựng phần mềm mới',
        'Viết tài liệu đặc tả chức năng làm cơ sở cho nhóm lập trình cùng nhóm kiểm thử thực hiện',
        'Tham gia nghiệm thu sản phẩm cùng người dùng nội bộ khi kết thúc mỗi giai đoạn phát triển',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm phân tích nghiệp vụ',
        'Thành thạo UML, BPMN',
        'Yêu cầu viết User Story',
      ],
      preferred: ['Ưu tiên ứng viên biết Agile, Scrum', 'Ưu tiên ứng viên có chứng chỉ IELTS'],
      benefits: ['Thu nhập 18 – 26 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },

  // ===== Thiết kế UI/UX =====
  {
    title: 'Nhân viên Thiết kế UI/UX',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 8,
    isOpen: true,
    description: jd({
      duties: [
        'Thiết kế giao diện cho ứng dụng web lẫn ứng dụng di động của công ty theo nhận diện thương hiệu',
        'Phỏng vấn người dùng nội bộ để tìm điểm khó dùng trong các màn hình hiện có của hệ thống',
        'Bàn giao bản thiết kế chi tiết cho lập trình viên rồi theo dõi cho tới khi sản phẩm hoàn thiện',
      ],
      required: [
        'Tối thiểu 1 năm kinh nghiệm UI/UX',
        'Thành thạo Figma, Adobe XD',
        'Yêu cầu thành thạo Wireframe, Prototype',
      ],
      preferred: ['Ưu tiên ứng viên biết Photoshop', 'Biết thêm UX Research là lợi thế'],
      benefits: ['Thu nhập 14 – 22 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },

  // ===== Quản lý dự án =====
  {
    title: 'Quản lý dự án phần mềm',
    location: 'Hà Nội',
    daysAgo: 9,
    isOpen: true,
    description: jd({
      duties: [
        'Lập kế hoạch triển khai các dự án phần mềm nội bộ theo mục tiêu được ban giám đốc giao hằng năm',
        'Điều phối nhân sự của nhóm phát triển để bảo đảm dự án hoàn thành đúng tiến độ đã cam kết',
        'Báo cáo tình hình dự án cho ban giám đốc mỗi tuần kèm đề xuất xử lý khi có vướng mắc',
      ],
      required: [
        'Tối thiểu 3 năm kinh nghiệm quản lý dự án',
        'Thành thạo Agile, Scrum',
        'Yêu cầu sử dụng tốt Jira, MS Project',
      ],
      preferred: ['Ưu tiên ứng viên có chứng chỉ PMP', 'Biết thêm quản lý rủi ro là lợi thế'],
      benefits: ['Thu nhập 30 – 45 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },

  // ===== IT nội bộ, bảo mật =====
  {
    title: 'Chuyên viên Quản trị hệ thống',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 10,
    isOpen: true,
    description: jd({
      duties: [
        'Quản lý máy chủ cùng thiết bị mạng tại văn phòng chính của công ty để bảo đảm hoạt động ổn định',
        'Cấp quyền truy cập hệ thống cho nhân viên mới theo đúng quy trình an toàn thông tin của công ty',
        'Hỗ trợ nhân viên xử lý sự cố máy tính trong giờ làm việc qua kênh hỗ trợ nội bộ',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm quản trị hệ thống',
        'Thành thạo Windows Server, Active Directory',
        'Yêu cầu nắm vững quản trị mạng',
      ],
      preferred: ['Ưu tiên ứng viên có chứng chỉ ISO 27001', 'Biết thêm an toàn thông tin là lợi thế'],
      benefits: ['Thu nhập 15 – 22 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },

  // ===== Kinh doanh =====
  {
    title: 'Nhân viên Kinh doanh B2B',
    location: 'Hà Nội',
    daysAgo: 11,
    isOpen: true,
    description: jd({
      duties: [
        'Tìm kiếm khách hàng doanh nghiệp có nhu cầu sử dụng giải pháp phần mềm quản lý của công ty',
        'Tư vấn giải pháp phù hợp với quy mô hoạt động của từng khách hàng rồi theo dõi tới khi ký hợp đồng',
        'Chăm sóc khách hàng sau bán hàng để duy trì quan hệ hợp tác lâu dài với công ty',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm bán hàng B2B',
        'Yêu cầu có kỹ năng đàm phán',
        'Bắt buộc sử dụng tốt CRM',
      ],
      preferred: ['Ưu tiên ứng viên biết Salesforce', 'Biết thêm tiếng Anh giao tiếp là lợi thế'],
      benefits: ['Lương cứng 12 triệu đồng/tháng cộng hoa hồng theo doanh số', ...COMMON_BENEFITS],
    }),
  },

  // ===== Chăm sóc khách hàng =====
  {
    title: 'Chuyên viên Chăm sóc khách hàng',
    location: 'Đà Nẵng',
    daysAgo: 12,
    isOpen: true,
    description: jd({
      duties: [
        'Tiếp nhận yêu cầu hỗ trợ của khách hàng đang sử dụng phần mềm của công ty qua điện thoại lẫn email',
        'Hướng dẫn khách hàng sử dụng các chức năng mới sau mỗi lần cập nhật phiên bản phần mềm',
        'Tổng hợp ý kiến phản hồi của khách hàng mỗi tháng gửi cho nhóm phát triển sản phẩm',
      ],
      required: [
        'Tối thiểu 1 năm kinh nghiệm chăm sóc khách hàng',
        'Thành thạo xử lý khiếu nại',
        'Thành thạo Zendesk',
      ],
      preferred: ['Ưu tiên ứng viên có kinh nghiệm Helpdesk', 'Ưu tiên ứng viên có chứng chỉ TOEIC'],
      benefits: ['Thu nhập 10 – 14 triệu đồng/tháng', ...COMMON_BENEFITS],
    }),
  },

  // ===== Marketing =====
  {
    title: 'Chuyên viên Digital Marketing',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 13,
    isOpen: true,
    description: jd({
      duties: [
        'Lên kế hoạch quảng bá sản phẩm phần mềm của công ty trên các kênh trực tuyến theo từng quý',
        'Theo dõi hiệu quả của từng chiến dịch quảng cáo để điều chỉnh ngân sách cho phù hợp',
        'Phối hợp với phòng kinh doanh để tìm kiếm khách hàng tiềm năng từ các kênh trực tuyến',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm Digital Marketing',
        'Thành thạo Facebook Ads, Google Ads',
        'Yêu cầu sử dụng tốt Google Analytics',
      ],
      preferred: ['Ưu tiên ứng viên biết SEO, Content Marketing', 'Biết thêm Email Marketing là lợi thế'],
      benefits: ['Thu nhập 14 – 22 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },

  // ===== Nhân sự =====
  {
    title: 'Chuyên viên Tuyển dụng',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 14,
    isOpen: true,
    description: jd({
      duties: [
        'Lập kế hoạch tuyển dụng hằng quý theo nhu cầu nhân sự của các phòng ban trong công ty',
        'Đăng tin tuyển dụng lên các kênh phù hợp rồi sàng lọc hồ sơ ứng viên theo yêu cầu vị trí',
        'Tổ chức phỏng vấn cùng trưởng phòng chuyên môn để chọn ứng viên phù hợp với văn hóa công ty',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm tuyển dụng',
        'Yêu cầu nắm vững Luật lao động',
        'Thành thạo Excel',
      ],
      preferred: ['Ưu tiên ứng viên có kinh nghiệm Employer Branding', 'Biết thêm C&B là lợi thế'],
      benefits: ['Thu nhập 13 – 20 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },

  // ===== Kế toán, tài chính =====
  {
    title: 'Kế toán tổng hợp',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 15,
    isOpen: true,
    description: jd({
      duties: [
        'Kiểm tra chứng từ kế toán phát sinh hằng ngày của công ty trước khi ghi nhận vào sổ sách',
        'Lập báo cáo quản trị hằng tháng gửi ban giám đốc theo mẫu đã được thống nhất từ đầu năm',
        'Làm việc với kiểm toán độc lập trong đợt kiểm toán báo cáo cuối năm của công ty',
      ],
      required: [
        'Tối thiểu 3 năm kinh nghiệm kế toán tổng hợp',
        'Thành thạo MISA, Excel',
        'Yêu cầu lập báo cáo tài chính',
      ],
      preferred: ['Ưu tiên ứng viên có kinh nghiệm kế toán thuế', 'Biết thêm phân tích tài chính là lợi thế'],
      benefits: ['Thu nhập 15 – 22 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },

  // ===== 2 tin đã đóng: kiểm tra tin đóng không hiện ở bảng tin công khai =====
  // Kế toán, tài chính
  {
    title: 'Kế toán thuế',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 27,
    isOpen: false,
    description: jd({
      duties: [
        'Lập tờ khai thuế giá trị gia tăng hằng tháng theo đúng quy định hiện hành của cơ quan thuế',
        'Theo dõi hóa đơn đầu vào của công ty để đối chiếu với số liệu trên phần mềm kế toán',
        'Chuẩn bị hồ sơ quyết toán thuế cuối năm để làm việc với cơ quan thuế khi có yêu cầu',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm kế toán thuế',
        'Thành thạo MISA, Excel',
        'Yêu cầu nắm vững quyết toán thuế',
      ],
      preferred: ['Ưu tiên ứng viên có kinh nghiệm kiểm toán', 'Biết thêm báo cáo tài chính là lợi thế'],
      benefits: ['Thu nhập 12 – 18 triệu đồng/tháng', ...COMMON_BENEFITS],
    }),
  },
  // Hành chính, pháp chế
  {
    title: 'Nhân viên Hành chính – Pháp chế',
    location: 'Hà Nội',
    daysAgo: 29,
    isOpen: false,
    description: jd({
      duties: [
        'Quản lý văn bản đến cùng văn bản đi của công ty theo đúng quy trình lưu trữ đã ban hành',
        'Chuẩn bị hợp đồng với đối tác theo mẫu của công ty trước khi trình ban giám đốc ký duyệt',
        'Theo dõi thời hạn của các hợp đồng đang thực hiện để nhắc phòng ban liên quan gia hạn kịp thời',
      ],
      required: [
        'Tối thiểu 1 năm kinh nghiệm hành chính văn phòng',
        'Yêu cầu soạn thảo hợp đồng',
        'Thành thạo quản lý hồ sơ',
      ],
      preferred: ['Ưu tiên ứng viên biết tiếng Nhật', 'Ưu tiên ứng viên có chứng chỉ JLPT'],
      benefits: ['Thu nhập 10 – 15 triệu đồng/tháng', ...COMMON_BENEFITS],
    }),
  },
];

// Tiêu đề tin mẫu của bản trước (17 tin đa ngành cũ) không còn trong danh sách trên.
// Chỉ dùng cho --remove để dọn tin mẫu cũ (cùng điều kiện: đúng HR, chưa có đơn ứng tuyển, hỏi y/N)
const LEGACY_DEMO_TITLES = [
  'Nhân viên Thiết kế đồ họa',
  'Nhân viên Hành chính – Văn phòng',
  'Nhân viên Mua hàng',
  'Nhân viên Kho vận (Logistics)',
  'Kỹ sư Điện tự động hóa',
  'Kỹ sư Thiết kế cơ khí',
  'Nhân viên Telesales',
];

// --remove xét cả tin mẫu cũ để dọn được dữ liệu của bản trước
const DEMO_TITLES = [...DEMO_JOBS.map((job) => job.title), ...LEGACY_DEMO_TITLES];

// ===== Tiện ích =====

function fail(message) {
  throw new Error(message);
}

// --recruiter=<email> hoặc --recruiter <email>
function readArgs(argv) {
  const args = { recruiter: '', remove: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--remove') {
      args.remove = true;
    } else if (arg.startsWith('--recruiter=')) {
      args.recruiter = arg.slice('--recruiter='.length);
    } else if (arg === '--recruiter') {
      args.recruiter = argv[i + 1] || '';
      i += 1;
    }
  }
  // Cùng cách chuẩn hóa với lúc đăng ký / tạo tài khoản
  args.recruiter = args.recruiter.trim().toLowerCase();
  return args;
}

// Chỉ in tên database để biết đang ghi vào đâu, không in tài khoản / mật khẩu trong chuỗi kết nối
function databaseName() {
  try {
    return decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '')) || '(không rõ)';
  } catch {
    return '(không đọc được DATABASE_URL)';
  }
}

// Ngày đăng cách đây n ngày, giờ cố định (9h + vài phút theo thứ tự) để thứ tự hiển thị ổn định
function daysAgo(days, index) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(9, index, 0, 0);
  return date;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    let answered = false;
    rl.question(question, (answer) => {
      answered = true;
      rl.close();
      resolve(answer);
    });
    // stdin đóng mà chưa trả lời (không có terminal) thì coi như "N"
    rl.on('close', () => {
      if (!answered) resolve('');
    });
  });
}

// HR nhận tin: phải là RECRUITER, đang hoạt động, đã có hồ sơ và công ty
async function findRecruiter(email) {
  if (!email) {
    fail('Thiếu --recruiter=<email HR>. Ví dụ: npm run seed:demo-jobs -- --recruiter=hr@congty.vn');
  }
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true, recruiterProfile: { include: { company: true } } },
  });
  if (!user) {
    fail(`Không tìm thấy tài khoản ${email}.`);
  }
  if (user.role.name !== 'RECRUITER') {
    fail(`Tài khoản ${email} là ${user.role.name}, không phải RECRUITER.`);
  }
  if (!user.isActive) {
    fail(`Tài khoản ${email} đang bị khóa.`);
  }
  if (!user.recruiterProfile) {
    fail(`Tài khoản ${email} chưa có hồ sơ nhà tuyển dụng.`);
  }
  if (!user.recruiterProfile.company) {
    fail(`Tài khoản ${email} chưa được gán công ty.`);
  }
  return user;
}

// ===== Tạo tin mẫu =====

async function createDemoJobs(user) {
  const profile = user.recruiterProfile;
  const summary = { created: 0, skipped: 0, parseFailed: 0 };

  for (const [index, demo] of DEMO_JOBS.entries()) {
    const existing = await prisma.job.findFirst({
      where: { title: demo.title, recruiterProfileId: profile.id },
      select: { id: true },
    });
    if (existing) {
      console.log(`Đã có, bỏ qua: ${demo.title} (id ${existing.id})`);
      summary.skipped += 1;
      continue;
    }

    const job = await prisma.job.create({
      data: {
        title: demo.title,
        description: demo.description,
        location: demo.location,
        isOpen: demo.isOpen,
        companyId: profile.companyId,
        recruiterProfileId: profile.id,
        createdAt: daysAgo(demo.daysAgo, index),
      },
    });
    summary.created += 1;

    // Phân tích JD bằng đúng service của API (chế độ rule). Lỗi một tin thì ghi log rồi đi tiếp
    try {
      const result = await parseJobDescription({ userId: user.id, role: 'RECRUITER' }, job.id);
      const counts = { REQUIRED: 0, PREFERRED: 0, OPTIONAL: 0 };
      result.requirements.forEach((item) => {
        counts[item.type] += 1;
      });
      console.log(
        `Đã tạo: ${demo.title} (id ${job.id}, ${demo.isOpen ? 'đang mở' : 'đã đóng'}) | ` +
          `${result.requirements.length} yêu cầu: ${counts.REQUIRED} bắt buộc, ${counts.PREFERRED} ưu tiên, ` +
          `${counts.OPTIONAL} tùy chọn`
      );
    } catch (err) {
      summary.parseFailed += 1;
      console.error(`Đã tạo: ${demo.title} (id ${job.id}) | PHÂN TÍCH JD LỖI: ${err.message}`);
    }
  }

  console.log('');
  console.log(`Tóm tắt: tạo mới ${summary.created}, bỏ qua ${summary.skipped}, parse lỗi ${summary.parseFailed}`);
}

// ===== Xóa tin mẫu (--remove) =====

async function removeDemoJobs(user) {
  const jobs = await prisma.job.findMany({
    where: { recruiterProfileId: user.recruiterProfile.id, title: { in: DEMO_TITLES } },
    orderBy: { id: 'asc' },
    select: { id: true, title: true, _count: { select: { applications: true } } },
  });
  const removable = jobs.filter((job) => job._count.applications === 0);
  const kept = jobs.filter((job) => job._count.applications > 0);

  if (jobs.length === 0) {
    console.log('Không có tin mẫu nào của HR này.');
    return;
  }
  if (kept.length > 0) {
    console.log('Giữ lại (đã có đơn ứng tuyển):');
    kept.forEach((job) => console.log(`  - ${job.title} (id ${job.id}, ${job._count.applications} đơn)`));
  }
  if (removable.length === 0) {
    console.log('Không có tin mẫu nào xóa được (tin nào cũng đã có đơn).');
    return;
  }

  console.log('Sẽ xóa (tin mẫu chưa có đơn ứng tuyển):');
  removable.forEach((job) => console.log(`  - ${job.title} (id ${job.id})`));
  const answer = await ask(`Xóa ${removable.length} tin mẫu ở trên? (y/N): `);
  if (answer.trim().toLowerCase() !== 'y') {
    console.log('Đã hủy, không xóa gì.');
    return;
  }

  let removed = 0;
  for (const job of removable) {
    // Kiểm tra lại "chưa có đơn" ngay trong lệnh xóa: có ai vừa nộp đơn thì tin được giữ lại
    const deleted = await prisma.$transaction(async (tx) => {
      const applicationCount = await tx.application.count({ where: { jobId: job.id } });
      if (applicationCount > 0) return false;
      await tx.jobRequirement.deleteMany({ where: { jobId: job.id } });
      await tx.job.delete({ where: { id: job.id } });
      return true;
    });
    if (deleted) {
      removed += 1;
    } else {
      console.log(`Giữ lại vì vừa có đơn ứng tuyển: ${job.title} (id ${job.id})`);
    }
  }
  console.log('');
  console.log(`Tóm tắt: đã xóa ${removed}, giữ lại ${jobs.length - removed}`);
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  console.log(`Database: ${databaseName()} | chế độ phân tích JD: rule (không gọi Gemini)`);
  const user = await findRecruiter(args.recruiter);
  console.log(`HR: ${user.email} | công ty: ${user.recruiterProfile.company.name}`);
  console.log('');

  if (args.remove) {
    await removeDemoJobs(user);
  } else {
    await createDemoJobs(user);
  }
}

main()
  .catch((err) => {
    console.error(`Dừng: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
