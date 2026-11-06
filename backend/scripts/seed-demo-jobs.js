// Tạo tin tuyển dụng mẫu đa ngành (D1) để xem giao diện và thử phân trang.
//
// Cách chạy (thư mục backend):
//   npm run seed:demo-jobs -- --recruiter=<email HR>                        (DB theo backend/.env)
//   node --env-file=.env.test scripts/seed-demo-jobs.js --recruiter=<email>  (DB test)
//   Thêm --remove: xóa CHỈ các tin mẫu (đúng danh sách tiêu đề dưới đây, đúng HR) chưa có đơn ứng tuyển,
//   có in danh sách và hỏi xác nhận y/N trước khi xóa.
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
// Dòng mô tả công việc viết thành câu dài liền mạch (không dấu phẩy, không "và / hoặc"): bộ tách yêu cầu
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

const DEMO_JOBS = [
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
        'Bắt buộc có kinh nghiệm làm việc với Docker',
      ],
      preferred: ['Ưu tiên ứng viên biết Python', 'Biết thêm Java là lợi thế'],
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
        'Tối ưu tốc độ tải trang để giao diện hiển thị tốt trên cả máy tính lẫn điện thoại di động',
        'Phối hợp với nhóm backend để thống nhất cách gọi API cho từng màn hình trong dự án',
      ],
      required: [
        'Tối thiểu 1 năm kinh nghiệm làm việc với React',
        'Thành thạo JavaScript, TypeScript',
        'Yêu cầu sử dụng được Figma',
      ],
      preferred: ['Ưu tiên ứng viên có kiến thức về thiết kế giao diện', 'Biết thêm Node.js là lợi thế'],
      benefits: ['Thu nhập 18 – 26 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Chuyên viên Kiểm thử phần mềm (Tester)',
    location: 'Hà Nội',
    daysAgo: 3,
    isOpen: true,
    description: jd({
      duties: [
        'Lập kế hoạch kiểm thử cho các tính năng mới dựa trên tài liệu yêu cầu của nhóm sản phẩm',
        'Viết kịch bản kiểm thử chi tiết rồi thực hiện kiểm thử trước mỗi lần phát hành phiên bản mới',
        'Ghi nhận lỗi trên công cụ quản lý công việc rồi theo dõi cho tới khi lỗi được xử lý xong',
      ],
      required: [
        'Tối thiểu 1 năm kinh nghiệm kiểm thử phần mềm',
        'Yêu cầu sử dụng được SQL',
        'Thành thạo Excel',
      ],
      preferred: ['Ưu tiên ứng viên biết JavaScript', 'Biết thêm Tiếng Anh giao tiếp là lợi thế'],
      benefits: ['Thu nhập 14 – 20 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Chuyên viên Phân tích dữ liệu',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 5,
    isOpen: true,
    description: jd({
      duties: [
        'Thu thập dữ liệu bán hàng từ nhiều hệ thống của công ty để xây dựng kho dữ liệu báo cáo chung',
        'Xây dựng báo cáo định kỳ giúp ban giám đốc theo dõi tình hình kinh doanh của từng khu vực',
        'Phân tích xu hướng mua hàng của khách hàng để đề xuất chương trình bán hàng cho phòng kinh doanh',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm phân tích dữ liệu',
        'Thành thạo SQL, Excel',
        'Yêu cầu sử dụng tốt Python',
      ],
      preferred: ['Ưu tiên ứng viên có kinh nghiệm nghiên cứu thị trường', 'Biết thêm SQL Server là lợi thế'],
      benefits: ['Thu nhập 20 – 28 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Kế toán tổng hợp',
    location: 'Hà Nội',
    daysAgo: 6,
    isOpen: true,
    description: jd({
      duties: [
        'Kiểm tra chứng từ thu chi hằng ngày rồi hạch toán đầy đủ vào phần mềm kế toán của công ty',
        'Lập báo cáo quản trị hằng tháng gửi ban giám đốc theo đúng thời hạn quy định của phòng tài chính',
        'Làm việc với cơ quan thuế cùng đơn vị kiểm toán độc lập trong các đợt quyết toán cuối năm',
      ],
      required: [
        'Tối thiểu 3 năm kinh nghiệm kế toán tổng hợp',
        'Thành thạo Excel, MISA',
        'Yêu cầu am hiểu báo cáo tài chính, thuế',
      ],
      preferred: ['Ưu tiên ứng viên có chứng chỉ kế toán trưởng', 'Biết thêm kiểm toán là lợi thế'],
      benefits: ['Thu nhập 15 – 22 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Nhân viên Kinh doanh B2B',
    location: 'Đà Nẵng',
    daysAgo: 8,
    isOpen: true,
    description: jd({
      duties: [
        'Tìm kiếm khách hàng doanh nghiệp mới tại khu vực miền Trung theo kế hoạch kinh doanh hằng quý',
        'Tư vấn giải pháp phù hợp nhu cầu của từng khách hàng rồi chuẩn bị báo giá gửi khách hàng',
        'Chăm sóc khách hàng hiện có để duy trì hợp đồng dài hạn với công ty trong nhiều năm tới',
      ],
      required: [
        'Tối thiểu 1 năm kinh nghiệm bán hàng cho doanh nghiệp',
        'Yêu cầu kỹ năng đàm phán, thuyết trình',
        'Thành thạo Excel',
      ],
      preferred: ['Ưu tiên ứng viên có kinh nghiệm chăm sóc khách hàng', 'Biết thêm Tiếng Anh giao tiếp là lợi thế'],
      benefits: ['Lương cứng 10 – 12 triệu đồng/tháng cộng hoa hồng theo doanh số', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Chuyên viên Digital Marketing',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 9,
    isOpen: true,
    description: jd({
      duties: [
        'Lên kế hoạch quảng cáo trực tuyến cho các dòng sản phẩm mới của công ty theo từng tháng',
        'Theo dõi chỉ số hiệu quả của từng chiến dịch để điều chỉnh ngân sách quảng cáo kịp thời',
        'Phối hợp với nhóm thiết kế để chuẩn bị hình ảnh quảng cáo đúng thời hạn của từng chiến dịch',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm làm việc với Facebook Ads, Google Ads',
        'Thành thạo SEO, Content Marketing',
        'Yêu cầu sử dụng tốt Excel',
      ],
      preferred: ['Ưu tiên ứng viên biết Email Marketing', 'Biết thêm Photoshop là lợi thế'],
      benefits: ['Thu nhập 15 – 25 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Chuyên viên Tuyển dụng',
    location: 'Hà Nội',
    daysAgo: 11,
    isOpen: true,
    description: jd({
      duties: [
        'Tiếp nhận nhu cầu nhân sự từ các phòng ban để lên kế hoạch tuyển dụng theo từng quý',
        'Đăng tin tuyển dụng trên các kênh phù hợp rồi sàng lọc hồ sơ ứng viên theo yêu cầu vị trí',
        'Tổ chức phỏng vấn cùng quản lý trực tiếp để đánh giá ứng viên trước khi gửi thư mời nhận việc',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm tuyển dụng',
        'Yêu cầu nắm vững luật lao động',
        'Thành thạo Excel',
      ],
      preferred: ['Ưu tiên ứng viên có kinh nghiệm đào tạo nội bộ', 'Biết thêm chấm công tính lương là lợi thế'],
      benefits: ['Thu nhập 14 – 20 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Chuyên viên Chăm sóc khách hàng',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 13,
    isOpen: true,
    description: jd({
      duties: [
        'Tiếp nhận yêu cầu của khách hàng qua điện thoại cùng các kênh trực tuyến trong giờ làm việc',
        'Giải đáp thắc mắc về sản phẩm rồi chuyển các trường hợp phức tạp cho bộ phận kỹ thuật xử lý',
        'Ghi nhận ý kiến của khách hàng để tổng hợp báo cáo chất lượng dịch vụ gửi quản lý mỗi tuần',
      ],
      required: [
        'Tối thiểu 1 năm kinh nghiệm chăm sóc khách hàng',
        'Yêu cầu có khả năng xử lý khiếu nại',
        'Bắt buộc có kinh nghiệm trực tổng đài',
      ],
      preferred: ['Ưu tiên ứng viên biết Tiếng Anh giao tiếp', 'Biết thêm Excel là lợi thế'],
      benefits: ['Thu nhập 9 – 12 triệu đồng/tháng cộng thưởng chất lượng dịch vụ', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Nhân viên Thiết kế đồ họa',
    location: 'TP. Hồ Chí Minh',
    daysAgo: 15,
    isOpen: true,
    description: jd({
      duties: [
        'Thiết kế ấn phẩm truyền thông cho các chương trình khuyến mãi của công ty theo từng tháng',
        'Chuẩn bị hình ảnh quảng cáo trên mạng xã hội theo yêu cầu của nhóm marketing trong từng chiến dịch',
        'Quản lý thư viện hình ảnh thương hiệu để đảm bảo các ấn phẩm dùng thống nhất một bộ nhận diện',
      ],
      required: [
        'Tối thiểu 1 năm kinh nghiệm thiết kế đồ họa',
        'Thành thạo Photoshop, Illustrator',
        'Yêu cầu sử dụng được Figma',
      ],
      preferred: ['Ưu tiên ứng viên biết dựng video', 'Biết thêm thiết kế giao diện là lợi thế'],
      benefits: ['Thu nhập 12 – 18 triệu đồng/tháng tùy năng lực', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Nhân viên Hành chính – Văn phòng',
    location: 'Hà Nội',
    daysAgo: 17,
    isOpen: true,
    description: jd({
      duties: [
        'Quản lý văn phòng phẩm cùng các thiết bị dùng chung tại văn phòng công ty mỗi ngày',
        'Sắp xếp lịch họp cho ban giám đốc rồi chuẩn bị phòng họp trước mỗi buổi làm việc với đối tác',
        'Lưu trữ hồ sơ hành chính theo đúng quy trình để các phòng ban tra cứu nhanh khi cần thiết',
      ],
      required: [
        'Tối thiểu 1 năm kinh nghiệm hành chính văn phòng',
        'Thành thạo Excel, Word',
        'Yêu cầu có khả năng làm việc nhóm',
      ],
      preferred: ['Ưu tiên ứng viên biết Tiếng Anh giao tiếp', 'Biết thêm luật lao động là lợi thế'],
      benefits: ['Thu nhập 9 – 12 triệu đồng/tháng', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Nhân viên Mua hàng',
    location: 'Bình Dương',
    daysAgo: 19,
    isOpen: true,
    description: jd({
      duties: [
        'Tìm kiếm nhà cung cấp nguyên vật liệu cho nhà máy theo kế hoạch sản xuất của từng tháng',
        'Đàm phán giá với nhà cung cấp rồi theo dõi tiến độ giao hàng tới kho của nhà máy',
        'Đánh giá chất lượng nhà cung cấp định kỳ để đề xuất danh sách đối tác cho năm kế tiếp',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm mua hàng trong nhà máy',
        'Thành thạo Excel',
        'Yêu cầu kỹ năng đàm phán',
      ],
      preferred: ['Ưu tiên ứng viên biết Tiếng Anh giao tiếp', 'Biết thêm quản lý chất lượng là lợi thế'],
      benefits: ['Thu nhập 12 – 16 triệu đồng/tháng', 'Xe đưa đón từ trung tâm thành phố', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Nhân viên Kho vận (Logistics)',
    location: 'Bình Dương',
    daysAgo: 22,
    isOpen: true,
    description: jd({
      duties: [
        'Tiếp nhận hàng hóa nhập kho rồi kiểm tra số lượng theo đúng chứng từ của nhà cung cấp',
        'Sắp xếp hàng hóa trong kho theo khu vực để thuận tiện cho việc xuất hàng mỗi ngày',
        'Kiểm kê hàng tồn kho cuối tháng để đối chiếu số liệu với phòng kế toán của công ty',
      ],
      required: [
        'Tối thiểu 1 năm kinh nghiệm quản lý kho',
        'Thành thạo Excel',
        'Bắt buộc nắm vững an toàn lao động',
      ],
      preferred: ['Ưu tiên ứng viên có chứng chỉ lái xe nâng', 'Biết thêm MISA là lợi thế'],
      benefits: ['Thu nhập 9 – 13 triệu đồng/tháng', 'Phụ cấp ăn ca, xe đưa đón', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Kỹ sư Điện tự động hóa',
    location: 'Bình Dương',
    daysAgo: 25,
    isOpen: true,
    description: jd({
      duties: [
        'Lập trình cho hệ thống điều khiển của các dây chuyền sản xuất tự động trong nhà máy',
        'Bảo trì định kỳ hệ thống điện của nhà máy theo kế hoạch đã được phòng kỹ thuật phê duyệt',
        'Xử lý sự cố điện trong ca sản xuất để dây chuyền hoạt động trở lại trong thời gian ngắn nhất',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm lập trình PLC',
        'Yêu cầu sử dụng được AutoCAD',
        'Bắt buộc nắm vững an toàn lao động',
      ],
      preferred: ['Ưu tiên ứng viên có kinh nghiệm bảo trì máy móc', 'Biết thêm Tiếng Anh giao tiếp là lợi thế'],
      benefits: ['Thu nhập 18 – 25 triệu đồng/tháng', 'Phụ cấp độc hại, xe đưa đón', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Kỹ sư Thiết kế cơ khí',
    location: 'Đồng Nai',
    daysAgo: 28,
    isOpen: true,
    description: jd({
      duties: [
        'Thiết kế chi tiết máy theo yêu cầu kỹ thuật của khách hàng cho các đơn hàng gia công',
        'Lập bản vẽ chế tạo chi tiết để chuyển xưởng sản xuất thực hiện theo đúng tiến độ đơn hàng',
        'Phối hợp với bộ phận chất lượng để kiểm tra sản phẩm mẫu trước khi sản xuất hàng loạt',
      ],
      required: [
        'Tối thiểu 2 năm kinh nghiệm thiết kế cơ khí',
        'Thành thạo AutoCAD, SolidWorks',
        'Yêu cầu hiểu biết về quản lý chất lượng',
      ],
      preferred: ['Ưu tiên ứng viên biết Tiếng Anh giao tiếp', 'Biết thêm quản lý dự án là lợi thế'],
      benefits: ['Thu nhập 16 – 24 triệu đồng/tháng', 'Phụ cấp ăn ca, xe đưa đón', ...COMMON_BENEFITS],
    }),
  },
  // 2 tin đã đóng: kiểm tra tin đóng không hiện ở bảng tin công khai
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
        'Yêu cầu nắm vững luật thuế hiện hành',
      ],
      preferred: ['Ưu tiên ứng viên có kinh nghiệm kiểm toán', 'Biết thêm báo cáo tài chính là lợi thế'],
      benefits: ['Thu nhập 12 – 18 triệu đồng/tháng', ...COMMON_BENEFITS],
    }),
  },
  {
    title: 'Nhân viên Telesales',
    location: 'Đà Nẵng',
    daysAgo: 29,
    isOpen: false,
    description: jd({
      duties: [
        'Gọi điện tư vấn sản phẩm cho khách hàng theo danh sách được phòng kinh doanh cung cấp mỗi ngày',
        'Cập nhật kết quả cuộc gọi lên hệ thống quản lý khách hàng ngay sau khi kết thúc ca làm việc',
        'Phối hợp với nhóm chăm sóc khách hàng để hỗ trợ khách hàng sau khi mua sản phẩm của công ty',
      ],
      required: [
        'Tối thiểu 1 năm kinh nghiệm trực tổng đài',
        'Yêu cầu có khả năng xử lý khiếu nại',
        'Bắt buộc giọng nói rõ ràng',
      ],
      preferred: ['Ưu tiên ứng viên có kinh nghiệm chăm sóc khách hàng', 'Biết thêm Excel là lợi thế'],
      benefits: ['Lương cứng 7 triệu đồng/tháng cộng thưởng doanh số', ...COMMON_BENEFITS],
    }),
  },
];

const DEMO_TITLES = DEMO_JOBS.map((job) => job.title);

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
