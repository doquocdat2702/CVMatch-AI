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
- 4 enum: CvStatus (UPLOADED, PROCESSING, COMPLETED, FAILED) | RequirementType (REQUIRED, PREFERRED, OPTIONAL) |
  MatchStatus (SUPPORTED, UNCERTAIN, NOT_FOUND) | ApplicationStatus (APPLIED, REVIEWING, ACCEPTED, REJECTED).
- Luồng cốt lõi:
  CV -> Text Extraction -> Hybrid CV Parsing -> Normalization -> Candidate Profile
  JD -> Requirement Extraction -> Classification -> Normalization -> Job Requirements
  Profile + Requirements -> Requirement-Evidence Matching -> Matrix -> Coverage -> Recommendation

## 4. Các quyết định đã chốt

### 4.1 Một công ty
- Schema giữ nguyên (vẫn có Company, companyId). Seed tạo đúng 1 Company từ COMPANY_NAME.
- Tạo recruiter không nhận companyId/companyName, tự gán công ty duy nhất. Đã bỏ GET /admin/companies.
- HR sửa thông tin công ty qua PUT /companies/me.

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
  Admin duy nhất quên: `node scripts/reset-admin-password.js`.
- Upload: tên file UUID, kiểm magic bytes (%PDF / PK), tối đa 5MB, `defParamCharset: 'utf8'` cho tên tiếng Việt.
  Thư mục upload KHÔNG phục vụ dạng file tĩnh.
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
- Coverage luôn hiển thị dạng **"x/y yêu cầu có bằng chứng (z%)"** + thanh màu trung tính, không thang đỏ-xanh,
  không nhãn "phù hợp/không phù hợp". Note của API luôn hiện ngay dưới.
- Tên hệ thống lấy từ `VITE_APP_NAME`.

### Route
- Công khai: `/` (bảng tin việc làm), `/jobs/:id`, `/login`, `/register`, `/forgot-password`, `/reset-password`.
  `/` và `/jobs/:id` dùng PublicLayout khi chưa đăng nhập, MainLayout khi đã đăng nhập.
- Ứng viên: Việc làm (`/`), Việc làm gợi ý (`/candidate/recommended-jobs`, chi tiết `/:jobId`),
  CV của tôi (`/candidate/cvs`, kết quả phân tích `/candidate/cvs/parsed`), Hồ sơ (`/candidate/profile`),
  Đơn ứng tuyển (`/candidate/applications`). Đăng nhập xong vào `/`.
- HR: `/recruiter/dashboard`, `/recruiter/profile`, `/recruiter/company`, `/recruiter/jobs` (+ `/new`, `/:id/edit`, `/:id/requirements`),
  `/recruiter/recommended-candidates`, `/recruiter/applications`.
  Đăng nhập xong vào `/recruiter/jobs` (sau T35c đổi sang dashboard).
- Admin: `/admin/dashboard`, `/admin/users`, `/admin/recruiters/new`, `/admin/roles`.
  Đăng nhập xong vào `/admin/users` (sau T35c đổi sang dashboard).

### Component dùng chung đã có
- 9 component common (T27): Button, Input, Select, Textarea, Table, Modal (có prop `wide`), Loading, Pagination, Badge.
- Layout: Header, Sidebar, MainLayout, PublicLayout.
- `ChangePasswordForm` (dùng ở trang Hồ sơ của cả 3 role), `RequirementEvidenceMatrix` (props thuần, HR dùng lại),
  `ApplyAction`, `components/cv-export/` (buildCVData + 2 mẫu CV Cổ điển / Hiện đại).
- utils: format.js (formatDateTime, formatDate, formatMonthYear, formatNumber), labels.js, apiError.js, roles.js, validation.js.
- api: auth, candidate, cv, job, matching, application (đã có getJobApplications, updateApplicationStatus cho HR).

## 6. Tiến độ (48 task)

| Giai đoạn | Task | Trạng thái |
|---|---|---|
| 1–8 Backend | T01–T25, T22b | Xong |
| 8b Gia cố & thống kê | G1–G6 | Xong |
| Kiểm thử backend | smoke / timeout / nlp-fail / real-mail | Xong |
| 9 Frontend | T26, T27, T28, T29, T29b, T30, T31, T32, T33, T34 | Xong |
| 9 Frontend | **T35** (3 trang admin), T35b, T35c | **Tiếp theo: T35** |
| 10 Đánh giá | T36–T38 | Chưa làm |

### Lưu ý cho các task còn lại
- **T33**: Profile HR đặt `<ChangePasswordForm />`; trang Công ty sửa công ty duy nhất; JobList dùng GET /jobs/my,
  sửa/đóng/xóa chỉ tin của mình; parse JD đọc `data.requirements`, mode rule + unresolvedCount > 0 thì nhắc
  "X yêu cầu chưa phân loại chắc chắn, đang để Ưu tiên, vui lòng kiểm tra lại".
- **T33 (đã xong)**: Badge có thêm status OPEN (xanh lá); tạo tin xong chuyển sang /recruiter/jobs/:id/edit;
  trang sửa có bảng yêu cầu CHỈ ĐỌC và nút Phân tích JD.
- **T34 (đã xong)**: ParsedJD tại /recruiter/jobs/:id/requirements; thêm menu HR "Ứng viên gợi ý"
  (/recruiter/recommended-candidates); component CandidateMatrixModal dùng chung cho 2 trang HR;
  ô chọn tin ở trang Ứng viên gợi ý và Đơn ứng tuyển chỉ liệt kê tin của chính HR (GET /jobs/my);
  lựa chọn tin + bộ lọc giữ trên URL (?jobId=&status=); chuyển đơn sang Đã chấp nhận/Đã từ chối có hộp xác nhận.
- **T35**: CreateRecruiter không chọn công ty (hiện tên công ty chỉ đọc); AccountList có nút "Đặt lại mật khẩu"
  (ẩn với chính admin đang đăng nhập); Hồ sơ admin có ChangePasswordForm.
- **T35c**: 2 trang Tổng quan, đổi trang đăng nhập mặc định của HR/Admin sang dashboard.
- **T36–T38**: so sánh rule vs hybrid trên cùng bộ dữ liệu. Trước bảo vệ cần bộ **dữ liệu demo thật**
  (job đa ngành, JD đầy đủ, CV mẫu phân tích hybrid để ma trận có đủ xanh/vàng/đỏ).

## 7. Kiểm thử

- DB test: `cv_matching_test`, cấu hình trong `backend/.env.test` (PORT 5001, NLP_MODE=rule). DB thật: `cvmatch`.
- Lệnh (thư mục backend, 1 terminal, cổng 5001 phải trống):
  - `npm run test:smoke` — reset DB test + chạy toàn bộ kịch bản (tự bật server ở chế độ rule)
  - `npm run test:timeout`, `npm run test:nlp-fail`
  - `node --env-file=.env.test scripts/test-real-mail.js <email>` — gửi mail thật, dán link khi được hỏi
- Script tự dừng nếu DATABASE_URL không chứa `_test`.
- **Lệnh reset DB do chủ dự án tự chạy**, AI không tự chạy lệnh xóa dữ liệu.
- Các file test (`backend/scripts/lib/`, `smoke-test.js`, `test-*.js` trừ `test-extract.js`) nằm trong .gitignore,
  chỉ lưu trên máy. Sao lưu thư mục `backend/scripts` ra ngoài sau mỗi lần sửa.
- Nhánh "admin cuối cùng" là lớp bảo vệ dự phòng, không kích hoạt được qua API.

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