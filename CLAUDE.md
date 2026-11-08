# CLAUDE.md — Hệ thống CV Parsing & JD Matching (khóa luận)

File này tổng hợp bối cảnh, các quyết định đã chốt và tiến độ của dự án.
Claude Code đọc file này ở đầu mỗi phiên. **Mọi quyết định dưới đây đã được chủ dự án duyệt**:
không tự thay đổi, thiếu thông tin thì HỎI.

Bộ prompt đầy đủ theo từng task (T00–T38, G1–G6) nằm trong tài liệu
"Bộ prompt vibe code — Hệ thống CV Parsing & JD Matching". T00 trong đó là prompt nền.

---

## 1. Bối cảnh

- Khóa luận: hệ thống CV Parsing và Job Description Matching, hỗ trợ kết nối ứng viên với vị trí tuyển dụng.
  Tuyển dụng đa ngành, không giới hạn CNTT.
- **Hệ thống phục vụ MỘT công ty duy nhất.** Recruiter (HR) là nhân viên nội bộ, do Admin cấp tài khoản.
  Recruiter KHÔNG tự đăng ký. Ứng viên tự đăng ký.
- Thầy hướng dẫn yêu cầu: tìm hiểu rule-based và cách dùng model AI để bóc tách CV,
  sau đó xuất ra một CV mới đẹp hơn (đã làm ở T29b).
- Nguyên tắc nghiệp vụ: AI chỉ hỗ trợ phân tích và đối chiếu, KHÔNG quyết định tuyển dụng.
  **Coverage là chỉ số đối chiếu yêu cầu, KHÔNG phải điểm năng lực.**

## 2. Tech stack (cố định, không thêm)

- Frontend: React + Vite (JavaScript), axios, react-router-dom. Chỉ CSS thuần / CSS module, state chỉ dùng Context.
- Backend: Node.js + Express (CommonJS), Prisma, MySQL 8, JWT, bcryptjs, multer, pdf-parse, mammoth,
  helmet, express-rate-limit, nodemailer.
- NLP: Gemini API (chế độ hybrid). Không training model.
- KHÔNG thêm thư viện, entity, enum, trường DB, endpoint, màn hình ngoài yêu cầu của task.

## 3. Phạm vi dữ liệu

- 3 role: ADMIN, CANDIDATE, RECRUITER.
- 7 module: Authentication & RBAC | Candidate & CV | AI/NLP Parsing & Matching |
  Recruiter & Company | Job & JD | Application | Admin.
- 14 entity: User, Role, Company, RecruiterProfile, CandidateProfile, CV, CandidateSkill,
  CandidateExperience, CandidateEducation, Skill, Job, JobRequirement, Application, Notification.
- **Ngoại lệ trường DB đã duyệt (T35g): `Application.cvId Int?`** (quan hệ tới CV, `onDelete: Restrict`, index cvId),
  migration `20261106201202_add_application_cv`. Ngoài trường này không thêm trường nào.
- 4 enum: CvStatus (UPLOADED, PROCESSING, COMPLETED, FAILED) | RequirementType (REQUIRED, PREFERRED, OPTIONAL) |
  MatchStatus (SUPPORTED, UNCERTAIN, NOT_FOUND) | ApplicationStatus (APPLIED, REVIEWING, ACCEPTED, REJECTED).
- Luồng cốt lõi:
  CV -> Text Extraction -> Hybrid CV Parsing -> Normalization -> Candidate Profile
  JD -> Requirement Extraction -> Classification -> Normalization -> Job Requirements
  Profile + Requirements -> Requirement-Evidence Matching -> Matrix -> Coverage -> Recommendation

## 4. Các quyết định đã chốt

### 4.1 Một công ty
- Schema giữ nguyên (vẫn có Company, companyId; `RecruiterProfile.companyId` NOT NULL + khóa ngoại).
- **Công ty cố định theo `COMPANY_NAME` (G7).** Biến bắt buộc trong `.env` (kiểm ở env.js cùng JWT_SECRET, NLP_MODE):
  thiếu, rỗng hoặc dài hơn 255 ký tự thì server không khởi động.
- Mỗi lần server khởi động (sau khi kết nối DB, trước khi listen) chạy `ensureSingleCompany` (company.service.js),
  idempotent, trong một transaction: bảng Company rỗng -> tạo; đúng 1 công ty khác tên -> đổi tên theo COMPANY_NAME
  (id và trường khác giữ nguyên); > 1 công ty -> không sửa gì, chỉ cảnh báo kèm số lượng. Có đúng 1 công ty thì gán
  HR chưa có công ty hợp lệ (companyId null hoặc trỏ công ty đã mất) vào công ty đó, bằng SQL có tham số
  (schema NOT NULL nên Prisma không lọc được null; DB đúng schema thì gán 0 dòng). Log một dòng
  "Công ty: <tên> | Đã gán N HR chưa có công ty". Không kết nối được DB thì server dừng, không listen.
  Đổi tên công ty = sửa COMPANY_NAME rồi khởi động lại server.
- Tạo recruiter không nhận companyId/companyName, tự gán công ty duy nhất. Đã bỏ GET /admin/companies.
  Admin đọc tên công ty (chỉ đọc) qua GET /admin/company (thêm ở T35, đã duyệt).
- HR sửa thông tin công ty qua PUT /companies/me, **trừ tên** (G7: trường name bị bỏ qua; chỉ gửi name thì 400 "Chưa có
  thay đổi nào để lưu."). Trang /recruiter/company hiện tên chỉ đọc kèm "Tên công ty được thiết lập sẵn, không sửa tại
  đây"; Hồ sơ HR chỉ hiện tên công ty (chưa có thì "Chưa được gán"), không ghi chú.
- Seed (`npm run seed`, G7): kiểm COMPANY_NAME, ADMIN_EMAIL, ADMIN_PASSWORD ngay đầu, thiếu thì dừng trước khi ghi.
  Thứ tự roles -> company (dùng chung ensureSingleCompany) -> admin -> skills. Admin theo ADMIN_EMAIL đã có thì
  **bỏ qua, không đổi mật khẩu / role / isActive** ("Admin đã tồn tại, bỏ qua"); chỉ tạo khi chưa có.
  Skill vẫn upsert (đặt lại aliases của skill có trong seed). Không bước nào xóa dữ liệu.
- Khách xem công ty duy nhất qua GET /api/company/public (T35d, đã duyệt trong task): không cần đăng nhập,
  chỉ trả name, description, address, website (không trả id). Dùng cho trang Giới thiệu và Liên hệ.
  (GET /companies/:id công khai có từ trước nhưng cần biết mã công ty, khách không có cách lấy khi chưa có tin nào mở.)

### 4.2 Phân quyền
- HR: **xem chung, sửa riêng.** Mọi HR xem được mọi job và đơn; chỉ người đăng job mới được sửa/đóng/xóa job,
  parse JD, sửa requirement, đổi trạng thái đơn (hàm dùng chung `assertCanManageJob`). Admin toàn quyền.
- HR nghỉ việc: admin tự sửa/đóng job của họ. Chức năng chuyển job sang HR khác: KHÔNG làm (hướng phát triển).
- Ứng viên chỉ xem đơn và CV của chính mình.
- auth.middleware đọc lại `isActive` và role từ DB ở mỗi request (khóa tài khoản, đổi role có hiệu lực ngay).
- Admin không tự khóa / tự xóa / tự hạ role; không được khóa hoặc hạ admin đang hoạt động cuối cùng.
- Xóa tài khoản có dữ liệu tuyển dụng (recruiter có job, ứng viên có đơn) -> 400, gợi ý khóa thay vì xóa.
- Đổi role sang RECRUITER/CANDIDATE mà chưa có hồ sơ -> tự tạo hồ sơ tối thiểu. Đổi sang đúng role hiện tại -> 400.
- PATCH status nhận `{ isActive: true | false }`, không toggle.

### 4.3 Bảo mật
- Rate limit đăng nhập: tối đa 10 lần SAI / 15 phút / IP (đăng nhập đúng không tính) -> 429.
- Quên mật khẩu qua email CHỈ cho ứng viên: token JWT ký bằng JWT_SECRET + mật khẩu đã băm, hạn 15 phút,
  dùng một lần, luôn trả câu chung (không lộ email nào tồn tại). Giới hạn 5 lần / 15 phút.
- HR/Admin quên mật khẩu: admin đặt lại (PATCH /admin/users/:id/password).
  Admin duy nhất quên: `node scripts/reset-admin-password.js` (ghi ở README.md mục Vận hành; trang Hồ sơ admin chỉ ghi
  "Nếu quên mật khẩu, liên hệ bộ phận kỹ thuật để đặt lại.", không hiện lệnh).
- Upload: tên file UUID, kiểm magic bytes (%PDF / PK), tối đa 5MB, `defParamCharset: 'utf8'` cho tên tiếng Việt.
  Thư mục upload KHÔNG phục vụ dạng file tĩnh.
- Xem file CV gốc (T35f, endpoint đã duyệt; quyền đổi ở T35g): `GET /api/cvs/:id/file`, cần đăng nhập. Ứng viên chỉ
  xem CV của mình; RECRUITER / ADMIN xem được khi CV đó là `cvId` của ít nhất một đơn (xem chung), và với đơn cũ
  `cvId` null thì xem được CV hiện tại của ứng viên đó (đúng CV trang Đơn đang hiện). Không có quyền hoặc mã sai -> 404
  "Không tìm thấy CV." (không lộ CV có tồn tại); file mất trên đĩa hoặc filePath ra ngoài UPLOAD_DIR -> 404
  "Không tìm thấy file CV.". PDF `inline`, DOCX `attachment`, tên file RFC 5987, `Cache-Control: private, no-store`.
  Frontend `openCvFile` (utils/cvFile.js) tải blob qua axios: PDF mở tab mới bằng object URL, DOCX tải về.
- CV gửi kèm đơn (T35g): `POST /applications` nhận `{ jobId, cvId }`, `cvId` bắt buộc với đơn mới; CV phải thuộc chính
  ứng viên và còn file, sai -> 400 ("Vui lòng chọn CV gửi kèm đơn ứng tuyển." / "Mã CV không hợp lệ." / "Không tìm thấy
  CV đã chọn. Vui lòng chọn CV khác." / "File của CV đã chọn không còn trên hệ thống. Vui lòng chọn CV khác."). Vẫn cần
  ít nhất một CV đã phân tích (COMPLETED) như trước. Đơn trả `cv { id, fileName, fileType } | null` + `cvLegacy` (cả
  `GET /applications/my` và `GET /applications/job/:id`); đơn cũ `cvId` null thì `cv` là CV hiện tại (mới nhất
  COMPLETED) và `cvLegacy = true`, giao diện ghi "Đang hiển thị CV hiện tại của bạn" (HR: "... của ứng viên"). Đã bỏ
  trường `currentCv`.
- Xóa CV đang là `cvId` của một đơn -> 400 "CV này đã được gửi kèm đơn ứng tuyển nên không thể xóa." (kiểm trước,
  khóa ngoại Restrict chặn dự phòng). `GET /cvs` trả thêm `applicationCount` mỗi CV. Rút đơn xong thì CV đó xóa được.
- **Đối chiếu vẫn dùng hồ sơ hiện tại** (lần phân tích CV gần nhất + chỉnh sửa của ứng viên), không đọc file CV của đơn.
  Mô tả chi tiết cách phân tích và đối chiếu: `docs/cach-phan-tich-va-doi-chieu.md`.
- helmet, CORS theo CORS_ORIGIN, JWT_SECRET >= 32 ký tự.
- Production: chỉ ẩn message của lỗi 500 không xác định; giữ message của lỗi đã định nghĩa (400/403/404/429/503).
- Frontend: axiosClient gặp 401 thì xóa phiên, chỉ chuyển /login khi đang ở route cần đăng nhập.
  Đăng nhập xong quay lại trang trước, chỉ nhận đường dẫn nội bộ (bắt đầu bằng `/`, không phải `//`).

### 4.4 NLP: chế độ rule / hybrid
- `NLP_MODE=rule|hybrid` (mặc định hybrid). Giá trị khác -> server không khởi động. Log chế độ khi khởi động.
- **rule**: không gọi Gemini. Kỹ năng bóc bằng từ điển bảng Skill (name + aliases, source RULE, isConfirmed false).
  Kinh nghiệm/học vấn không bóc, giữ nguyên dữ liệu cũ. Yêu cầu JD rule không phân loại được -> PREFERRED.
- **hybrid**: rule + Gemini, gộp kỹ năng theo skillId. Gemini lỗi hoặc thiếu key -> 503, giữ nguyên dữ liệu cũ.
- Parse JD trả `data = { requirements, mode, unresolvedCount }`. Parse CV trả thêm `mode`.
- Parse lỗi -> CV.status = FAILED, errorMessage "Phân tích thất bại: <lý do>", giữ rawText.
  Parse thành công -> COMPLETED + cập nhật parsedAt (trong cùng transaction với dữ liệu).
- Parse ở chế độ rule chỉ thay kỹ năng chưa xác nhận có source RULE, giữ kỹ năng từ NLP.
- Khóa ngắn < 3 ký tự (QA, AI, JS...) chỉ khớp khi viết HOA và đứng riêng.
- Seed: MySQL, PostgreSQL, SQL Server là Skill riêng, tách khỏi SQL (quy tắc T14). Illustrator không có alias "ai".
- Retry gọi LLM CHỈ với lỗi tạm thời (mạng, timeout, 5xx); KHÔNG retry 429, 401, 403.
- `EXTRACT_TIMEOUT_MS` (mặc định 15000).
- Hạn mức Gemini miễn phí rất thấp: làm việc/test hằng ngày dùng `NLP_MODE=rule`; demo và đánh giá dùng hybrid.

### 4.5 Dashboard (ngoại lệ đã duyệt)
- 2 trang Tổng quan cho HR (`/recruiter/dashboard`, scope mine|all) và Admin (`/admin/dashboard`).
- Chỉ count/groupBy, không thêm bảng. Biểu đồ vẽ bằng CSS thuần, KHÔNG thư viện biểu đồ.
- KHÔNG làm: xuất Excel/PDF thống kê, log hệ thống, cấu hình hệ thống, lọc theo khoảng ngày.

## 5. Giao diện

- Thiết kế đã chốt ở T27, lưu trong `frontend/docs/design.md` và `src/styles/variables.css`.
  **Từ T28 trở đi: tuân theo design.md, chỉ dùng biến trong variables.css, không tự đặt màu/cỡ chữ.**
- Skill `frontend-design` dùng để định hướng thẩm mỹ; khi xung đột, T00 được ưu tiên.
- Ý tưởng "tờ hồ sơ, mực xanh". Màu chính Xanh mực `#0B63CE` (hover `#084C9E`), Xanh nhạt `#E8F1FC`,
  Mực đen `#14202E`, Chì `#52606F`, Nền `#F4F7FB`, Viền `#DDE4EE`, Viền đậm `#8592A3`.
  Badge: xanh lá / vàng / đỏ / xám xanh. Mọi cặp màu đạt WCAG AA.
- Font tự host trong `public/fonts/` (Be Vietnam Pro cho giao diện, Source Serif 4 cho tiêu đề), có giấy phép OFL.
  Không gọi Google Fonts. Font dự phòng: Arial, Times New Roman (không dùng Georgia vì vỡ dấu).
- Không emoji, không gradient, không card đổ bóng tràn lan, không icon trang trí. index.html `lang="vi"`.
  Icon chức năng chỉ có chuông thông báo (T35b) và 3 icon footer vị trí / điện thoại / phong bì (T35e, ngoại lệ đã duyệt),
  đều là SVG viết tay. Tên công ty và thanh dưới của footer viết hoa (ngoại lệ đã duyệt).
- Coverage luôn hiển thị dạng **"x/y yêu cầu có bằng chứng (z%)"** + thanh màu trung tính, không thang đỏ-xanh,
  không nhãn "phù hợp/không phù hợp". Note của API luôn hiện ngay dưới.
- Tên hệ thống lấy từ `VITE_APP_NAME`, khai báo trong **`frontend/.env`** (Vite chỉ đọc .env của thư mục frontend;
  đặt ở backend/.env không có tác dụng). Thiếu biến thì dùng tên mặc định "Tuyển dụng DMatch". Đổi tên thì sửa tay
  chữ cái trong `frontend/public/favicon.svg` (hiện là "D" cho "DMatch").

### Route
- Công khai: `/` (bảng tin việc làm), `/jobs/:id`, `/about` (Giới thiệu), `/contact` (Liên hệ),
  `/privacy` (Chính sách bảo mật, T35e), `/terms` (Điều khoản sử dụng, T35e), `/login`, `/register`,
  `/forgot-password`, `/reset-password`. Các trang này nằm trong PUBLIC_PATHS của axiosClient.
  `/`, `/jobs/:id`, `/about`, `/contact`, `/privacy`, `/terms` dùng SiteLayout (có footer) cho khách và ứng viên,
  MainLayout (không footer) cho HR và Admin.
- Ứng viên (SiteLayout, menu ngang Việc làm / Giới thiệu / Liên hệ, từ T35d):
  Việc làm (`/`, tab "Gợi ý theo CV của bạn" ở `/?view=recommended`; `/candidate/recommended-jobs` chuyển tới tab này,
  chi tiết đối chiếu giữ `/candidate/recommended-jobs/:jobId`). Trong AccountMenu: Hồ sơ (`/candidate/profile`),
  CV của tôi (`/candidate/cvs`, kết quả phân tích `/candidate/cvs/parsed`), Đơn ứng tuyển (`/candidate/applications`),
  Đổi mật khẩu (`/candidate/change-password`, T35e). Không còn mục menu "Việc làm gợi ý". Đăng nhập xong vào `/`.
  4 trang Hồ sơ / CV của tôi / Đơn ứng tuyển / Đổi mật khẩu nằm trong khu **"Tài khoản của tôi"** (`AccountLayout`, T35g:
  cột tóm tắt + menu bên trái); `/candidate/cvs/parsed` và `/candidate/recommended-jobs/:jobId` giữ bố cục riêng.
  Trang chủ chỉ tìm theo tên vị trí (`?keyword=`), **đã bỏ ô / lọc địa điểm** (T35g; địa điểm vẫn hiện trên thẻ tin).
- HR: `/recruiter/dashboard`, `/recruiter/profile`, `/recruiter/change-password` (T35e), `/recruiter/company`,
  `/recruiter/jobs` (+ `/new`, `/:id/edit`, `/:id/requirements`), `/recruiter/recommended-candidates`, `/recruiter/applications`.
  Đăng nhập xong vào `/recruiter/dashboard` (từ T35c).
- Admin: `/admin/dashboard`, `/admin/users`, `/admin/recruiters/new`, `/admin/roles`, `/admin/profile` (T35, đã duyệt),
  `/admin/change-password` (T35e). Đăng nhập xong vào `/admin/dashboard` (từ T35c).
- Đổi mật khẩu (T35e): 3 route trên, mỗi route chỉ cho đúng role (sai role -> /403), dùng chung trang
  `pages/common/ChangePassword` (h1 + ChangePasswordForm). Trang Hồ sơ của cả 3 role không còn form mật khẩu.
- Đăng xuất (T35e, cả 3 role): xóa phiên rồi về `/` (bố cục khách), không mang theo trang cũ. `logout()` và
  `navigate('/')` đặt trong cùng `startTransition` (BrowserRouter của React Router 7 đổi route trong transition;
  nếu xóa phiên render trước, ProtectedRoute đẩy về /login). Hành vi axiosClient khi gặp 401 giữ nguyên.

### Component dùng chung đã có
- 9 component common (T27): Button, Input, Select, Textarea, Table, Modal (có prop `wide`), Loading, Pagination, Badge.
- Layout: Header (Logo + chuông + email + Đăng xuất), Sidebar (từ T35d chỉ HR/Admin), MainLayout (chỉ HR/Admin),
  NotificationBell (T35b, trong Header của HR và SiteLayout của ứng viên),
  SiteLayout (T35d, khách + ứng viên: menu ngang; dưới 900px header 2 hàng từ T35e; có SiteFooter),
  AccountMenu (T35d, chỉ ứng viên; họ tên lấy từ `profileName` trong AuthContext, T35e),
  Logo (T35e: ô chữ 28px + tên, link về trang chủ theo role), SiteFooter + FooterIcons (T35e, chỉ SiteLayout).
  Đã xóa PublicLayout (T35e).
- `ChangePasswordForm` (từ T35e chỉ dùng ở trang Đổi mật khẩu riêng), `RequirementEvidenceMatrix` (props thuần, HR dùng lại),
  `ApplyAction`, `components/cv-export/` (buildCVData + 2 mẫu CV Cổ điển / Hiện đại),
  `components/dashboard/` (T35c: StatCard, BarChart vẽ bằng div + CSS).
- utils: format.js (formatDateTime, formatDate, formatMonthYear, formatNumber, formatRelativeTime; T35f thêm
  formatRelative, formatPostedAt), labels.js (có CV_STATUS_LABEL từ T35c), apiError.js, roles.js, validation.js,
  pagination.js (D1; CARD_PAGE_SIZE từ T35f), cvFile.js, cvUpload.js, jobText.js (T35f).
- api: auth, candidate, cv, job, matching, application (đã có getJobApplications, updateApplicationStatus cho HR),
  admin (T35: getUsers, updateUserStatus, updateUserRole, resetUserPassword, deleteUser, createRecruiter, getCompany),
  notification (T35b: getNotifications, getUnreadCount, markAsRead, markAllAsRead),
  getRecruiterDashboard (recruiter.api, T35c), getAdminDashboard (admin.api, T35c),
  getPublicCompany (company.api, T35d; từ T35e giữ kết quả trong bộ nhớ phiên, lỗi thì bỏ để gọi lại,
  updateMyCompany xóa bản lưu).
- hooks: useAuth (thêm profileName, setProfileName ở T35e), usePublicCompany (T35e: footer, /privacy, /terms),
  useDocumentTitle (T35f).
- Component T35f: `components/job/` (JobCard, JobCardList, JobCardSkeleton), `components/matching/CoverageBar`,
  `components/layout/` PageHeader + Panel (chỉ trang ứng viên), `components/cv/CvViewButton`,
  `components/application/ApplicationProgress`.
- appConfig.js: APP_NAME, CONTACT_EMAIL, CONTACT_PHONE (T35d), FACEBOOK_URL, YOUTUBE_URL (T35e), lấy từ
  VITE_CONTACT_EMAIL / VITE_CONTACT_PHONE / VITE_FACEBOOK_URL / VITE_YOUTUBE_URL, khai báo trong .env.example.
- variables.css: thêm `--logo-mark-size: 28px` (T35e); T35f thêm `--text-4xl`, `--leading-4xl`, `--text-measure`,
  `--control-height-lg`, `--touch-target`, `--aside-width`, `--duration-pulse` (ghi trong design.md).

## 6. Tiến độ (50 task)

| Giai đoạn | Task | Trạng thái |
|---|---|---|
| 1–8 Backend | T01–T25, T22b | Xong |
| 8b Gia cố & thống kê | G1–G6, G7 (công ty cố định theo COMPANY_NAME, seed an toàn) | Xong |
| Kiểm thử backend | smoke / timeout / nlp-fail / real-mail | Xong |
| 9 Frontend | T26, T27, T28, T29, T29b, T30, T31, T32, T33, T34, T35, T35b, T35c, T35d, T35e, T35f, T35g, T35h | Xong |
| 10 Đánh giá | **T36**–T38 | **Tiếp theo: T36** |

### Lưu ý cho các task còn lại
- **T33**: Profile HR đặt `<ChangePasswordForm />`; trang Công ty sửa công ty duy nhất; JobList dùng GET /jobs/my,
  sửa/đóng/xóa chỉ tin của mình; parse JD đọc `data.requirements`, mode rule + unresolvedCount > 0 thì nhắc
  "X yêu cầu chưa phân loại chắc chắn, đang để Ưu tiên. Vui lòng kiểm tra lại."
- **T33 (đã xong)**: Badge có thêm status OPEN (xanh lá); tạo tin xong chuyển sang /recruiter/jobs/:id/edit;
  trang sửa có bảng yêu cầu CHỈ ĐỌC và nút Phân tích JD.
- **T34 (đã xong)**: ParsedJD tại /recruiter/jobs/:id/requirements; thêm menu HR "Ứng viên gợi ý"
  (/recruiter/recommended-candidates); component CandidateMatrixModal dùng chung cho 2 trang HR;
  ô chọn tin ở trang Ứng viên gợi ý và Đơn ứng tuyển chỉ liệt kê tin của chính HR (GET /jobs/my);
  lựa chọn tin + bộ lọc giữ trên URL (?jobId=&status=); chuyển đơn sang Đã chấp nhận/Đã từ chối có hộp xác nhận.
- **T35**: CreateRecruiter không chọn công ty (hiện tên công ty chỉ đọc); AccountList có nút "Đặt lại mật khẩu"
  (ẩn với chính admin đang đăng nhập); Hồ sơ admin có ChangePasswordForm.
- **T35 (đã xong)**: chủ dự án duyệt thêm GET /admin/company (tên công ty chỉ đọc ở trang Tạo nhà tuyển dụng) và
  trang Hồ sơ admin `/admin/profile` (email, vai trò, ChangePasswordForm; menu "Hồ sơ" cuối menu admin).
  Tài khoản và Phân quyền: lọc vai trò + tìm email + trang giữ trên URL (?role=&email=&page=), 10 dòng/trang.
  Dòng của chính admin ẩn mọi thao tác. Khóa và xóa có hộp xác nhận, mở khóa chạy ngay.
  Xóa bị 400 (đã có tin/đơn): hộp hiện nguyên câu API, nút Xóa đổi thành "Khóa tài khoản thay vì xóa".
  Đổi vai trò chỉ giữa RECRUITER và CANDIDATE, chọn trong bảng rồi xác nhận mới lưu.
  Badge có thêm ACTIVE (xanh lá) và LOCKED (đỏ). UnderConstruction chỉ còn cho 2 route dashboard.
- **T35b (đã xong)**: chuông thông báo trong Header (ứng viên, HR; admin không có). Hỏi số chưa đọc khi mount
  và mỗi 30 giây (setInterval, dọn khi unmount), không socket. Dropdown 10 thông báo mới nhất, tải lại mỗi lần mở.
  NEW_APPLICATION: thông báo chỉ có applicationId nên gọi GET /applications/:id (API có sẵn) lấy job.id
  -> /recruiter/applications?jobId=; đơn đã rút (applicationId null) -> /recruiter/applications.
  APPLICATION_STATUS_CHANGED -> /candidate/applications. Không sửa backend.
  variables.css thêm `--popover-width`, `--z-dropdown`.
- **T35c (đã xong)**: 2 trang Tổng quan dùng API G6. HR có nút "Tin của tôi / Toàn công ty" (?scope=all trên URL),
  3 StatCard, BarChart đơn theo trạng thái, theo ngày (30 cột), phân bố coverage (kèm câu
  "Tỉ lệ có bằng chứng chỉ cho biết mức đáp ứng yêu cầu, không phải điểm năng lực." và note của API). Admin: StatCard theo role,
  bị khóa, tin, đơn, tỷ lệ xử lý CV thành công (chưa có CV xử lý xong thì "Chưa có dữ liệu");
  BarChart người dùng mới theo tháng, CV theo trạng thái. Không tự làm mới số liệu.
  "Tổng quan" đứng đầu menu HR và Admin; /recruiter và /admin chuyển tới dashboard. Đã xóa UnderConstruction.
  Cùng commit: sửa bảng bị bẻ chữ ở 375px (MyApplications, CVUpload, JobList, bảng yêu cầu ở JobForm,
  RequirementEvidenceMatrix) bằng độ rộng tối thiểu cột chữ chính, như bảng admin T35.
- **T35d (đã xong)**: ngoại lệ bố cục đã duyệt cho khách và ứng viên. SiteLayout: tên hệ thống | Việc làm, Giới thiệu,
  Liên hệ (gạch chân 2px Xanh mực, NavLink) | khách: Đăng nhập + Đăng ký, ứng viên: chuông + AccountMenu.
  Dùng `--content-max` có sẵn, không thêm biến. AccountMenu: chữ cái đầu trong ô tròn + tên rút gọn (chữ cuối họ tên,
  lấy từ GET /candidates/me) + ▾ vẽ bằng CSS; đóng khi bấm ngoài / Esc / Tab ra ngoài / đổi route.
  Trang `/`: ứng viên thấy tab Tất cả / Gợi ý theo CV của bạn (role tablist, `?view=recommended`, giữ `?page`),
  gọi API gợi ý ngay khi vào trang để tab có số; khách, HR, Admin không thấy tab (bỏ qua `?view`).
  Trang RecommendedJobs đổi thành `RecommendedJobsPanel` (nhận data qua props), card bấm được cả khối.
  Chưa có dữ liệu phân tích: "Bạn chưa có CV đã phân tích..." + link "Đến CV của tôi".
  `/about`, `/contact` công khai (thêm vào PUBLIC_PATHS của axiosClient); Liên hệ không có form, không gửi mail.
  Dưới 900px: nút "Menu" mở panel dọc; khách giữ "Đăng nhập" trên header, "Đăng ký" vào panel.
- **T35e (đã xong, 2 lượt, 1 commit)**: Logo (Header HR/Admin, SiteLayout, footer, trang đăng nhập) + favicon.svg viết tay;
  SiteLayout dưới 900px bỏ nút "Menu", header 2 hàng; trang Đổi mật khẩu riêng cho 3 role; đăng xuất về `/`;
  lưu Hồ sơ ứng viên cập nhật tên trên AccountMenu ngay; footer SiteLayout (Logo, tên công ty viết hoa, địa chỉ,
  điện thoại, email, website, Facebook / YouTube dạng link chữ, cột link, thanh dưới © + Chính sách bảo mật + Điều khoản);
  3 icon footer là ngoại lệ đã duyệt; trang `/privacy`, `/terms` nội dung tĩnh (câu cần chủ dự án duyệt đánh dấu
  `{/* CẦN CHỦ DỰ ÁN DUYỆT */}` trong JSX). API gợi ý việc làm không gọi Gemini (chỉ matcher đọc DB).
- **T35f (đã xong, 2 lượt, chủ dự án tự commit)**: lượt 1 xem CV đã ứng tuyển (endpoint file CV ở mục 4.3) + luồng ứng tuyển:
  khách bấm "Ứng tuyển ngay" -> /login -> quay lại `/jobs/:id?apply=1` tự mở hộp (bỏ ?apply=1 sau khi mở); hộp liệt kê CV
  (Badge, "CV hiện tại", Xem; T35g đổi thành radio chọn CV gửi kèm), chưa có CV đã phân tích thì tải + phân tích ngay trong hộp; đã nộp -> "Đã ứng tuyển" khóa +
  "Xem đơn ứng tuyển"; tin đóng -> "Tin tuyển dụng đã ngừng nhận đơn". Trang Đơn có tiến trình 3 bước (`ApplicationProgress`), HR có cột "Xem CV".
  Lượt 2 giao diện phía ứng viên (design.md mục 6):
  trang chủ có khối mở đầu Xanh mực tràn bề ngang (câu dẫn + tên công ty serif 48px + "N vị trí đang tuyển" + tìm theo
  `keyword` / `location` của GET /jobs, trên URL; T35g bỏ ô địa điểm), lưới thẻ 2 cột (`components/job/`: JobCard, JobCardList,
  JobCardSkeleton), 10 thẻ/trang (`CARD_PAGE_SIZE`; bảng HR giữ `PAGE_SIZE` 9), dòng nhắc tải CV, khung xương khi tải,
  "Xóa bộ lọc". Chi tiết tin: breadcrumb, 2 cột + khung ứng tuyển sticky (`ApplyAction variant="panel"`, coverage qua
  `CoverageBar` tách từ tab Gợi ý), JD tách phần bằng `utils/jobText.js`, "Vị trí khác đang tuyển" 3 thẻ; route
  `/jobs/:id` có key theo mã tin (JobDetailRoute). Dưới 900px nút ứng tuyển dính đáy. CV của tôi / Hồ sơ / Đơn ứng tuyển /
  Đổi mật khẩu dùng `PageHeader` + `Panel` (components/layout), thẻ thay bảng, trạng thái rỗng có một hành động chính;
  ChangePassword nhận `siteStyle` chỉ ở route ứng viên. SiteLayout: nền nội dung là Nền, `overflow-x: clip`, viền focus
  mặc định, vùng bấm 44px dưới 900px. `useDocumentTitle` (hooks) đặt tiêu đề tab "<trang> | <tên hệ thống>".
  format.js thêm `formatRelative`, `formatPostedAt`. variables.css thêm `--text-4xl`/`--leading-4xl`, `--text-measure`,
  `--control-height-lg`, `--touch-target`, `--aside-width`, `--duration-pulse`. Modal thêm prop `closeButtonClassName`,
  CvViewButton thêm `variant` (mặc định như cũ). Giao diện HR / Admin không đổi.
- **T35g (đã xong, chủ dự án tự commit)**: lưu CV đã nộp (`Application.cvId`, mục 3 và 4.3); hộp ứng tuyển chọn CV bằng
  radio (chọn sẵn CV mới nhất, "Xem" từng CV, "Tải CV mới" tải + phân tích rồi tự chọn), dòng ghi chú màu Chì về file
  gửi kèm và hồ sơ đối chiếu, thêm câu "Lưu ý: hồ sơ của bạn chưa được cập nhật từ CV này." khi CV đang chọn khác CV có
  `parsedAt` mới nhất. Khu Tài khoản (`components/layout/AccountLayout`): tóm tắt (chữ viết tắt, họ tên, email,
  "Hồ sơ đã có x/7 mục" + thanh trung tính; không có "Tham gia" vì API không trả createdAt) + menu NavLink; dưới 900px
  tóm tắt một dòng, menu thành tab cuộn ngang. Hồ sơ chia Thông tin cá nhân (email chỉ đọc) / Kỹ năng (chip, nhãn nguồn)
  / Kinh nghiệm / Học vấn (dòng thời gian, chỉ đọc). Đổi mật khẩu: `ChangePasswordForm enhanced` (Hiện / Ẩn,
  aria-pressed, danh sách 3 điều kiện có sẵn: 6 ký tự, khác mật khẩu cũ, xác nhận khớp); HR / Admin giữ form cũ.
  Trang Kết quả phân tích có khung "Cách hệ thống đọc CV của bạn" (mở sẵn lần đầu, localStorage), nhãn nguồn
  Từ điển / AI / Tự nhập (`PROFILE_SOURCE_LABEL` trong labels.js) + Đã / Chưa xác nhận; Chi tiết đối chiếu có chú thích
  3 trạng thái theo đúng matcher. Bỏ ô địa điểm ở trang chủ. Tài liệu `docs/cach-phan-tich-va-doi-chieu.md`.
  variables.css thêm `--account-mark-size`. Smoke test (file local) đã gửi `cvId` và có ca mới cho cvId / xóa CV / quyền xem.
  **DB thật chưa có migration `add_application_cv`**: trước khi chạy `npm run dev` trên cvmatch, sao lưu DB rồi chạy
  `npx prisma migrate deploy` (thư mục backend, dùng `.env`); Prisma client đã sinh lại theo schema mới nên chưa migrate
  thì mọi truy vấn Application trên cvmatch lỗi thiếu cột.
- **T35h (đã xong, chủ dự án tự commit)**: chỉ viết lại câu chữ hiển thị (frontend, message API backend, email quên mật
  khẩu), không đổi logic / route / API / mã HTTP. Quy ước từ đây: gọi ứng viên là "bạn", HR / Admin trung tính; không
  "chúng tôi" (trừ Giới thiệu, Chính sách, Điều khoản); câu trọn vẹn có dấu chấm, nhãn / nút / tiêu đề không chấm; lỗi
  nói chuyện gì xảy ra + làm gì tiếp; viết hoa đầu câu. Thuật ngữ: Tin tuyển dụng, Đơn ứng tuyển, Rút đơn, Nhà tuyển dụng,
  Quản trị viên, "mô tả công việc" thay JD, "tỉ lệ (yêu cầu) có bằng chứng" thay coverage trên giao diện; trạng thái đơn
  Đã ứng tuyển / Đang xem xét / Đã chấp nhận / Đã từ chối; CV Đang phân tích / Phân tích lỗi. Message test trên máy
  (smoke, test-timeout, test-nlp-fail, test-real-mail) đã đổi theo câu mới.
- **T36–T38**: so sánh rule vs hybrid trên cùng bộ dữ liệu. Trước bảo vệ cần bộ **dữ liệu demo thật**
  (job đa ngành, JD đầy đủ, CV mẫu phân tích hybrid để ma trận có đủ xanh/vàng/đỏ).

## 7. Kiểm thử

- DB test: `cv_matching_test`, cấu hình trong `backend/.env.test` (PORT 5001, NLP_MODE=rule). DB thật: `cvmatch`.
- Lệnh (thư mục backend, 1 terminal, cổng 5001 phải trống):
  - `npm run test:smoke` — reset DB test + chạy toàn bộ kịch bản (tự bật server ở chế độ rule).
    Không reset (chạy trên dữ liệu hiện có, hậu tố riêng): `node --env-file=.env.test scripts/smoke-test.js`
  - `npm run test:timeout`, `npm run test:nlp-fail`
  - `node --env-file=.env.test scripts/test-real-mail.js <email>` — gửi mail thật, dán link khi được hỏi
- Script tự dừng nếu DATABASE_URL không chứa `_test`.
- **Lệnh reset DB do chủ dự án tự chạy**, AI không tự chạy lệnh xóa dữ liệu.
- Các file test (`backend/scripts/lib/`, `smoke-test.js`, `test-*.js` trừ `test-extract.js`) nằm trong .gitignore,
  chỉ lưu trên máy. Sao lưu thư mục `backend/scripts` ra ngoài sau mỗi lần sửa.
- Nhánh "admin cuối cùng" là lớp bảo vệ dự phòng, không kích hoạt được qua API.
- `.env.test` nên khai báo `COMPANY_NAME` (như `.env.test.example`). Thiếu thì dotenv trong env.js nạp bù từ `.env`
  và server test đổi tên công ty trong DB test thành tên công ty thật.
- `npm run dev` (nodemon, dùng `.env` = cvmatch) tự khởi động lại khi file trong `backend/` đổi, và mỗi lần khởi động
  đều chạy `ensureSingleCompany` trên cvmatch. Khi AI sửa code backend lúc khởi động, chủ dự án dừng `npm run dev` trước.

## 8. Quy tắc làm việc

- Một task = một lượt chat = một commit. Chỉ làm đúng task được giao, không làm trước task sau.
- Không refactor, không sửa code của task trước nếu không được yêu cầu.
- Cuối mỗi task báo cáo theo mẫu 8 mục (task frontend có mục "3 điểm cần hiểu").
- Việc gì dùng key, tài nguyên thật (Gemini, Gmail) hoặc xóa dữ liệu thì HỎI trước.
- Không commit: `.env`, `.env.test`, `samples/` (CV thật), `uploads/`, file test. Kiểm tra `git status` trước mỗi commit.
- Không in giá trị bí mật (key, mật khẩu) ra output.
- Thay đổi seed/schema: sao lưu DB trước.

## 9. Hướng phát triển (ghi vào khóa luận, không làm)

Chuyển job giữa HR, refresh token / tokenVersion, token trong cookie httpOnly, audit log,
xuất file thống kê, xác minh email khi đăng ký, LLM chạy cục bộ (Ollama), cache kết quả LLM.

## 10. Chuẩn bị ngày bảo vệ

- Dùng API key Gemini riêng cho demo (project riêng), cân nhắc bật billing kèm giới hạn ngân sách.
- Chuẩn bị sẵn dữ liệu đã phân tích để dự phòng khi Gemini hết hạn mức (chuyển NLP_MODE=rule).
- Tập demo một lần khi ngắt Wi-Fi thật (font tự host nên vẫn đúng dấu; Gemini và mail sẽ không chạy).
- Không chạy test vào ngày bảo vệ.