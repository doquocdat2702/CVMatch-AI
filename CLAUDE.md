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
  migration `20261106201202_add_application_cv`.
- **Ngoại lệ trường DB đã duyệt (T35k): `CandidateProfile.avatarPath String?` và `CandidateProfile.objective String?
  @db.Text`**, migration `20261117090000_add_candidate_avatar_objective`. Ngoài các trường này không thêm trường nào.
  KHÔNG có Sở thích, Ngày sinh, Giới tính; KHÔNG lưu / hiển thị mức độ thành thạo kỹ năng.
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
- **Tin công khai (T35j, mở rộng response / tham số của API có sẵn, không thêm endpoint)**: `GET /jobs` và
  `GET /jobs/:id` trả thêm `skills: [tên Skill]` mỗi tin (từ JobRequirement có skillId, Bắt buộc -> Ưu tiên -> Không
  bắt buộc, không trùng, tối đa 5); `GET /jobs` trả thêm `topSkills` (6 Skill có ở nhiều tin đang mở nhất, mỗi tin
  đếm một lần, bằng nhau thì theo tên). `keyword` khớp tiêu đề HOẶC tên / alias Skill trong yêu cầu của tin (so cả
  dạng không dấu `normalizeText`); từ khóa >= 3 ký tự khớp một phần, ngắn hơn chỉ khớp đúng tên / một alias ("Go"
  ra Skill Go, "c" không khớp mọi kỹ năng có chữ c). Không N+1: skills của cả trang lấy trong một truy vấn.
- Khách xem công ty duy nhất qua GET /api/company/public (T35d, đã duyệt trong task): không cần đăng nhập,
  chỉ trả name, description, address, website (không trả id). Dùng cho trang Giới thiệu và Liên hệ.
  (GET /companies/:id công khai có từ trước nhưng cần biết mã công ty, khách không có cách lấy khi chưa có tin nào mở.)

### 4.2 Phân quyền
- HR: **xem chung, sửa riêng.** Mọi HR xem được mọi job và đơn; chỉ người đăng job mới được sửa/đóng/xóa job,
  parse JD, sửa requirement, đổi trạng thái đơn (hàm dùng chung `assertCanManageJob`). Admin toàn quyền.
- HR nghỉ việc: admin tự sửa/đóng job của họ. Chức năng chuyển job sang HR khác: KHÔNG làm (hướng phát triển).
  **Từ QA2 (QA-01)**: route sửa / đóng / xóa tin, phân tích JD, thêm / sửa / xóa yêu cầu, xem đơn của một tin
  (`GET /applications/job/:jobId`) và đổi trạng thái đơn cho cả RECRUITER và ADMIN (`authorize('RECRUITER', 'ADMIN')`);
  kiểm "đúng người đăng tin" vẫn ở `assertCanManageJob`, ADMIN đi qua không điều kiện.
  **Từ QA3**: giao diện admin quản lý tin ở `/admin/jobs` (mục 5, Route). `GET /jobs/my` cho RECRUITER và ADMIN: RECRUITER
  vẫn chỉ tin của mình, ADMIN nhận mọi tin của mọi HR (gồm tin đã đóng); mỗi tin trả thêm `recruiterProfile { id, fullName }`.
  Admin KHÔNG tạo tin (`POST /jobs` vẫn chỉ RECRUITER).
- Ứng viên chỉ xem đơn và CV của chính mình.
- "Ứng viên gợi ý" (QA2, QA-04) chỉ lấy hồ sơ có CV COMPLETED của tài khoản đang hoạt động và vẫn là CANDIDATE (lọc
  trong truy vấn). Danh sách đơn ứng tuyển của HR KHÔNG lọc theo trạng thái tài khoản (đơn đã nộp vẫn cần xử lý).
- auth.middleware đọc lại `isActive` và role từ DB ở mỗi request (khóa tài khoản, đổi role có hiệu lực ngay).
- Admin không tự khóa / tự xóa / tự hạ role; không được khóa hoặc hạ admin đang hoạt động cuối cùng.
- Xóa tài khoản có dữ liệu tuyển dụng (recruiter có job, ứng viên có đơn) -> 400, gợi ý khóa thay vì xóa.
- Đổi role sang RECRUITER/CANDIDATE mà chưa có hồ sơ -> tự tạo hồ sơ tối thiểu. Đổi sang đúng role hiện tại -> 400.
- PATCH status nhận `{ isActive: true | false }`, không toggle.
- Đơn của mọi tin do chính HR đăng (T35i, endpoint đã duyệt trong task): `GET /api/applications/mine`, chỉ RECRUITER,
  gồm cả tin đã đóng, `?status=&page=&limit=` (mặc định 1 / 10, status sai -> 400), mới nộp trước; mỗi đơn trả
  `job { id, title, isOpen }` (Job không có trường status), `candidate { id, fullName }`, `cv`, `cvLegacy`, `coverage`,
  kèm `pagination` và `note`. Một lần count + một lần findMany (không N+1). Đổi trạng thái vẫn qua `assertCanManageJob`.

### 4.3 Bảo mật
- Rate limit đăng nhập: tối đa 10 lần SAI / 15 phút / IP (đăng nhập đúng không tính) -> 429.
- **Đăng ký (QA-25)**: tối đa 30 lần / giờ / IP, tính MỌI request (`registerLimiter`) -> 429 "Bạn đã đăng ký quá nhiều lần.
  Vui lòng thử lại sau 1 giờ.". Đăng nhập bằng email không tồn tại vẫn so bcrypt với chuỗi băm giả cố định
  (`auth.service.js: DUMMY_PASSWORD_HASH`, cost 10) để thời gian phản hồi gần bằng khi email có thật; câu lỗi giữ nguyên
  "Email hoặc mật khẩu không đúng.".
- **Không bật `trust proxy` (QA-27)**: limiter theo IP tính theo IP kết nối thật. Bật khi chạy trực tiếp thì client tự gửi
  `X-Forwarded-For` để vượt giới hạn; chỉ bật (đúng số tầng proxy) khi triển khai sau Nginx / proxy (mục 9, README).
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
- **Ảnh đại diện ứng viên (T35k, 2 endpoint đã duyệt)**: `POST /api/candidates/me/avatar` (multipart, field `avatar`) và
  `DELETE /api/candidates/me/avatar`, chỉ CANDIDATE, chỉ hồ sơ của chính mình (kiểm role trước khi nhận file). Chỉ nhận
  JPEG / PNG theo MAGIC BYTES (FFD8FF, 89504E470D0A1A0A), không tin đuôi file hay Content-Type; SVG, GIF, WEBP và mọi loại
  khác -> 400 "Chỉ nhận ảnh JPEG hoặc PNG."; tối đa **1 MB** -> 400 "Ảnh vượt quá 1 MB. Vui lòng chọn ảnh nhỏ hơn.". Multer
  giữ file trong bộ nhớ, kiểm xong mới ghi `UPLOAD_DIR/avatars/<uuid>.jpg|png` (thư mục upload vẫn không phục vụ tĩnh).
  Tải ảnh mới thì xóa file cũ; DELETE xóa file + `avatarPath = null`; admin xóa tài khoản ứng viên thì xóa cả file ảnh.
  Không thêm endpoint đọc ảnh: ảnh trả dạng data URI base64 hoặc null trong trường `avatar` (thẻ img không gửi token
  được, bản in CV cần ảnh nằm sẵn). **`GET /candidates/me` chỉ có trường `avatar` khi gọi kèm `?avatar=1`** (đúng chuỗi
  "1"); không có tham số thì response không có trường này. Frontend `getMyProfile({ withAvatar: true })` chỉ ở 3 chỗ:
  thẻ tóm tắt khu Tài khoản ứng viên (`AccountAreas`), trang Hồ sơ, hộp Xuất CV; nơi khác (AccountMenu, chi tiết tin,
  chi tiết đối chiếu, Kết quả phân tích CV) gọi không kèm. PUT /candidates/me KHÔNG trả `avatar` (giao diện không dùng);
  chỉ 2 endpoint ảnh luôn trả `avatar` để trang Hồ sơ cập nhật ảnh ngay.
  **QA2 (QA-36)**: `POST /me/avatar` giới hạn 10 lần tải THÀNH CÔNG / 15 phút / tài khoản (`avatarUploadLimiter`, đặt sau
  kiểm role, lần bị từ chối không tính) -> 429 "Bạn đã đổi ảnh đại diện quá nhiều lần. Vui lòng thử lại sau 15 phút.".
  Đổi / xóa ảnh ghi `avatarPath` có điều kiện "vẫn là giá trị vừa đọc" (`swapAvatarPath`, thử lại tối đa 5 lần, quá thì
  409) và chỉ xóa đúng file vừa bị thay, nên hai lần tải cùng lúc không để lại file mồ côi.
  `avatarPath` không bao giờ trả ra ngoài; ảnh KHÔNG trả cho HR / Admin (`GET /candidates/:id`, `GET /admin/users/:id`
  bỏ `avatarPath`). Base64 nặng ~1,33 lần ảnh (ảnh 1 MB -> ~1,33 MB, chỉ ở các lần gọi kèm ảnh).
- **Đối chiếu vẫn dùng hồ sơ hiện tại** (lần phân tích CV gần nhất + chỉnh sửa của ứng viên), không đọc file CV của đơn.
  Mô tả chi tiết cách phân tích và đối chiếu: `docs/cach-phan-tich-va-doi-chieu.md`.
- helmet, CORS theo CORS_ORIGIN, JWT_SECRET >= 32 ký tự.
- Production: chỉ ẩn message của lỗi 500 không xác định; giữ message của lỗi đã định nghĩa (400/403/404/429/503).
  **Từ QA2 (QA-02)**: lỗi 5xx không xác định (lỗi bất ngờ, lỗi Prisma có đường dẫn file và đoạn code) KHÔNG trả message
  gốc ở BẤT KỲ chế độ nào (câu chung "Đã có lỗi xảy ra. Vui lòng thử lại sau."), log máy chủ vẫn ghi đủ kèm stack.
  `error.middleware.js` đổi lỗi thư viện sang câu tiếng Việt: Prisma P2000 (chuỗi dài hơn cột) -> 400, JSON hỏng -> 400,
  body quá lớn -> 413. Đường dẫn `/api/...` không tồn tại -> 404 JSON (QA-10). Mã số > 2147483647 -> 400 như mã sai
  (`utils/ids.js: MAX_DB_ID`, QA-08); `limit` phân trang tối đa 50 (`MAX_PAGE_SIZE`, QA-06). Từ khóa / địa điểm tìm tin
  escape `%` `_` `\` (QA-07). Website công ty chỉ nhận `http://` / `https://` (QA-11).
- **Không trả `filePath` / `rawText` của CV (QA2, QA-31)**: `cv.service.js: toCvView` bỏ cả hai khỏi response tải lên,
  danh sách, chi tiết, trích xuất; thay bằng `textLength` (số ký tự đọc được). Không màn hình nào cần toàn văn CV.
  Tên file gốc dài hơn 255 ký tự thì cắt phần tên, giữ đuôi.
- Frontend: axiosClient gặp 401 thì xóa phiên, chỉ chuyển /login khi đang ở route cần đăng nhập.
  Đăng nhập xong quay lại trang trước, chỉ nhận đường dẫn nội bộ (bắt đầu bằng `/`, không phải `//`).
  **Từ QA2 (QA-03)**: ProtectedRoute chuyển /login kèm `state.from` (đường dẫn + query); axiosClient gặp 401 tải lại
  `/login?from=<đường dẫn>`; Login đọc `state.from` hoặc `?from=`. Không quay lại `/login` và trang thuộc khu của role khác
  (`utils/roles.js: belongsToOtherRole`, vd ứng viên mở `/admin/...`), khi đó về trang chính của role.

### 4.4 NLP: chế độ rule / hybrid
- `NLP_MODE=rule|hybrid` (mặc định hybrid). Giá trị khác -> server không khởi động. Log chế độ khi khởi động.
- **rule**: không gọi Gemini. Kỹ năng bóc bằng từ điển bảng Skill (name + aliases, source RULE, isConfirmed false).
  Kinh nghiệm/học vấn không bóc, giữ nguyên dữ liệu cũ. Yêu cầu JD rule không phân loại được -> PREFERRED.
- **hybrid**: rule + Gemini, gộp kỹ năng theo skillId. Gemini lỗi hoặc thiếu key -> 503, giữ nguyên dữ liệu cũ.
- Parse JD trả `data = { requirements, mode, unresolvedCount }`. Parse CV trả thêm `mode`.
- Parse lỗi -> CV.status = FAILED, errorMessage "Phân tích thất bại: <lý do>", giữ rawText.
  Parse thành công -> COMPLETED + cập nhật parsedAt (trong cùng transaction với dữ liệu).
  **QA-24**: chỉ bước phân tích thành công ghi parsedAt; bước trích xuất chữ (`extractCvText`) không đụng parsedAt,
  đọc file lỗi hay phân tích lỗi đều giữ nguyên parsedAt cũ.
- Parse ở chế độ rule chỉ thay kỹ năng chưa xác nhận có source RULE, giữ kỹ năng từ NLP.
- **Mục tiêu nghề nghiệp (T35k)**: ứng viên tự nhập (tối đa 1000 ký tự, backend cắt khoảng trắng thừa, quá -> 400).
  Phân tích CV tự điền: rule tìm đoạn dưới tiêu đề (T35l mở rộng; không phân biệt hoa thường, có / không dấu, có / không
  dấu hai chấm, bỏ số thứ tự và ký hiệu đầu dòng ■ ◆ ● ► ➤ ✓ #): "Mục tiêu nghề nghiệp", "Mục tiêu công việc",
  "Mục tiêu", "Định hướng nghề nghiệp", "Giới thiệu bản thân", "Giới thiệu", "Về tôi", "Tóm tắt", "Career Objective",
  "Objective", "Career Goal(s)", "Summary", "Professional Summary", "About Me", "Profile Summary". KHÔNG nhận "Profile"
  đứng một mình (thường là thông tin liên hệ; vẫn là tiêu đề dừng). `rule.parser.js: findObjective` (trả kèm lý do) /
  `extractObjective`, tới tiêu đề mục kế tiếp, tối đa 1000 ký tự; hybrid: Gemini trả `objective`, không có thì dùng
  kết quả rule. Không điền được thì `cv.service.js` ghi một dòng log `[CV] CV <id>: không điền mục tiêu nghề nghiệp vì
  ...` (không thấy tiêu đề khớp / có tiêu đề nhưng không có nội dung / hybrid thì Gemini cũng không trả / ô đã có nội
  dung sẵn); chỉ mã CV và lý do, không ghi nội dung CV, không hiện ra giao diện. **QUY TẮC KHÔNG GHI ĐÈ: chỉ điền khi objective đang
  trống** (điều kiện nằm ngay trong lệnh ghi `updateMany where objective null`), như họ tên / số điện thoại / tiêu đề.
  Không có trường DB nào phân biệt "ứng viên nhập" với "phân tích điền" nên đã điền một lần thì CV sau cũng không thay;
  muốn lấy mục tiêu từ CV mới thì ứng viên xóa trống ô rồi phân tích lại. Trang Hồ sơ (chế độ sửa) nhắc đúng câu này
  dưới bộ đếm, chỉ khi ô đang có nội dung: "Xóa trống ô này rồi phân tích lại CV nếu muốn lấy mục tiêu từ CV mới."
- Khóa ngắn < 3 ký tự (QA, AI, JS...) chỉ khớp khi viết HOA và đứng riêng.
- Seed: MySQL, PostgreSQL, SQL Server là Skill riêng, tách khỏi SQL (quy tắc T14). Illustrator không có alias "ai".
- **Seed theo phòng ban (Task F2)**: 133 Skill, nhóm bằng comment trong `prisma/seed.js`: Phát triển phần mềm, Ứng dụng
  di động, Kiểm thử, DevOps / hạ tầng, Dữ liệu và AI, Sản phẩm / phân tích nghiệp vụ, Thiết kế UI/UX, Quản lý dự án,
  IT nội bộ / bảo mật, Kinh doanh, Chăm sóc khách hàng, Marketing, Nhân sự, Kế toán / tài chính, Hành chính / pháp chế,
  Ngoại ngữ, cộng nhóm kỹ thuật có từ trước. Không thêm kỹ năng mềm. Một khóa (name / alias) chỉ thuộc một Skill; tên đã
  là alias của Skill khác thì không thêm Skill mới (Project Management, C&B, Tiếng Anh, Customer Support). Không dùng
  alias từ đơn dễ khớp nhầm ("go", "ads", "test", "api", "ai", "ml"...). `skill.dictionary.json` tách HTML, CSS thành 2 mục.
- **Chuẩn hóa tên kỹ năng (Task F1)**, `normalizer.js: expandSkillName`, dùng chung cho kỹ năng CV (rule, Gemini, trước
  bước gộp theo skillId) và tên yêu cầu khi phân tích JD: bỏ phần trong ngoặc ("JavaScript (ES6+)" -> JavaScript);
  trong ngoặc là Skill đã biết thì tách riêng ("Cơ sở dữ liệu (MySQL, PostgreSQL)" -> MySQL, PostgreSQL); trong ngoặc
  là mô tả thì bỏ. Khóa ngắn trong ngoặc theo đúng quy tắc viết HOA. HR tự thêm / sửa yêu cầu thì giữ tên nhập.
  **Đã duyệt (F5-A2)**: áp dụng cho cả tên yêu cầu khi phân tích mô tả công việc.
- **Ghép theo tên (Task F2, đã duyệt F5-A1)**: bên thiếu skillId được ghép theo tên đã chuẩn hóa (`skillNameKey`) và
  tra bảng Skill; KHÔNG đổi quy tắc trạng thái: trùng tên -> EXACT, tra ra cùng Skill -> PARTIAL, khác Skill -> NONE.
  Phân tích lại CV / JD thì skillId được lưu và ra EXACT. Chi tiết: `docs/cach-phan-tich-va-doi-chieu.md` mục 6.1b, 8.1.
- **Skill Go (đã duyệt F5-A3)**: rule chỉ nhận "GO" viết HOA đứng riêng hoặc "Golang" (quy tắc khóa ngắn); Gemini trả
  "Go" vẫn tra ra Skill Go.
- **Dấu "/" (Task F5)**: bộ tách yêu cầu JD (`requirement.extractor.js: protectSkillSlashes`) giữ nguyên cụm "A/B" (bỏ
  khoảng trắng hai bên "/") khi cả cụm là name / alias của một Skill: CI/CD, UI/UX, TCP/IP (alias của Networking).
  Còn lại tách như cũ ("Excel/Word", "MySQL / PostgreSQL"). Bộ bóc CV khớp nguyên cụm, bỏ khoảng trắng hai bên "/"
  ("CI / CD" ra CI/CD). Skill C/C++ (alias c++, cpp, c/c++; không có alias "c" đơn lẻ) giữ nguyên "C/C++",
  "C++" trong CV ra C/C++. UI Design bỏ alias "thiet ke ui" vì chiếm mất "thiết kế UI/UX".
- Retry gọi LLM CHỈ với lỗi tạm thời (mạng, timeout, 5xx); KHÔNG retry 429, 401, 403.
- **Gemini trả phí (Task F4, đã kiểm bằng fetch giả)**: 429 gọi 1 lần, không thử lại, CV / JD trả 503 câu "Phân tích
  bằng AI đang tạm gián đoạn...". Tên model đọc từ `GEMINI_MODEL` trong .env (không đặt thì `gemini-3.5-flash`, env.js).
  `.env.example` có ghi chú dùng key của project bật billing + giới hạn quota.
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
  không nhãn "phù hợp/không phù hợp".
- **Note của API và câu nhắc 'không phải điểm năng lực' / 'quyết định tuyển dụng thuộc về nhà tuyển dụng' chỉ hiện
  phía HR, /privacy và /terms; KHÔNG hiện ở các màn hình ứng viên** (T35j, D4), kể cả khối Quy trình ứng tuyển trên
  trang chủ. Phía HR: một dòng nhỏ dưới bảng trong CandidateMatrixModal và trang Ứng viên gợi ý.
  Màn hình ứng viên tối đa MỘT câu phụ, chỉ giữ khi thiếu nó người dùng sẽ làm sai.
- Khối "Quy trình ứng tuyển" (trang chủ): 4 bước, mỗi bước một câu; số thứ tự chỉ do `<ol>` sinh ra (CSS counter),
  không in số bằng tay.
- Bảng đối chiếu KHÔNG có khối "Cách đọc bảng này". Badge trạng thái (`components/matching/MatchStatusBadge`, trong
  RequirementEvidenceMatrix nên cả Chi tiết đối chiếu và CandidateMatrixModal của HR) có chú thích một câu: "Có bằng
  chứng — Hồ sơ có kỹ năng hoặc bằng cấp đúng với yêu cầu." / "Chưa chắc chắn — Hồ sơ có dấu hiệu liên quan nhưng chưa
  đủ rõ." / "Không tìm thấy — Hồ sơ chưa có thông tin về yêu cầu này." Rê chuột: thuộc tính `title` (không thư viện
  tooltip); bấm (cảm ứng / bàn phím): câu hiện dưới Badge, bấm ra ngoài hoặc Esc thì ẩn; `aria-describedby` cho trình
  đọc màn hình. Quy tắc đầy đủ (số năm, hai kỹ năng khác nhau không tính là khớp): `docs/cach-phan-tich-va-doi-chieu.md`
  mục 8.4.
- Kiểu chữ (T35j): Source Serif 4 chỉ ở Logo, tiêu đề trang (h1 / PageHeader), khối mở đầu trang chủ và nửa Xanh mực
  của trang auth; tiêu đề thẻ tin, Panel, nhóm dùng Be Vietnam Pro đậm. Badge "Không tìm thấy" màu xám xanh (mọi bảng
  đối chiếu, kể cả HR).
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
  Đăng nhập xong vào `/recruiter/dashboard` (từ T35c). Từ T35i Sidebar HR: Tổng quan, Tin tuyển dụng, Ứng viên gợi ý,
  Đơn ứng tuyển, Tài khoản (`/recruiter/profile`; khu Tài khoản gồm Hồ sơ / Thông tin công ty / Đổi mật khẩu).
- Admin: `/admin/dashboard`, `/admin/users`, `/admin/recruiters/new`, `/admin/roles`, `/admin/profile` (T35, đã duyệt),
  `/admin/change-password` (T35e). Đăng nhập xong vào `/admin/dashboard` (từ T35c). Từ T35i Sidebar admin: Tổng quan,
  Tài khoản người dùng (`/admin/users`, sáng cả ở `/admin/recruiters/new`, mở trang tạo bằng nút trên danh sách), Phân
  quyền, Tài khoản (`/admin/profile`; khu Tài khoản gồm Hồ sơ / Đổi mật khẩu).
  **Từ QA3**: `/admin/jobs` (Tin tuyển dụng, mục Sidebar ngay trên "Tài khoản"), `/admin/jobs/:id/edit`,
  `/admin/jobs/:id/requirements`, dùng lại `JobList` / `JobForm` / `ParsedJD` của HR (đường dẫn gốc theo role). Trang
  admin có thêm cột Người đăng và lọc trạng thái `?status=open|closed` (phân trang phía client như trang HR), không có
  "Tạo tin mới", không có route `jobs/new`; trang sửa / yêu cầu bỏ bước kiểm người đăng khi là admin. Nút Đóng / Xóa theo
  đúng quy tắc của HR (chỉ đóng tin đang mở, chỉ xóa tin chưa có đơn). Trang HR giữ nguyên (không cột Người đăng, không
  lọc). Chưa có lọc theo người đăng nên `/admin/users` không có link "Xem tin đã đăng".
- Đổi mật khẩu (T35e): 3 route trên, mỗi route chỉ cho đúng role (sai role -> /403), dùng chung trang
  `pages/common/ChangePassword`. Trang Hồ sơ của cả 3 role không còn form mật khẩu. Từ T35i cả 3 role cùng một kiểu
  (PageHeader + Panel + ChangePasswordForm có Hiện / Ẩn, danh sách điều kiện; đã bỏ prop `enhanced`, `siteStyle`).
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
- Khu Tài khoản (T35i): `AccountLayout` chỉ trình bày (prop `items`, `navLabel`, `summary`, `outletContext`); dữ liệu
  thẻ tóm tắt do `components/layout/AccountAreas.jsx` tải: `CandidateAccountLayout`, `RecruiterAccountLayout`,
  `AdminAccountLayout`. Trang con gọi `useOutletContext().refreshProfile` sau khi lưu hồ sơ.
- `ChangePasswordForm` (từ T35e chỉ dùng ở trang Đổi mật khẩu riêng), `RequirementEvidenceMatrix` (props thuần, HR dùng lại;
  T35j chia nhóm theo loại, tiêu đề dòng là tên tiêu chí, prop `notFoundLink`, `note` chỉ HR truyền),
  `ApplyAction`, `components/cv-export/` (buildCVData + 3 mẫu CV Cổ điển / Hiện đại / Chuyên nghiệp),
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
- Component T35k: `components/cv-export/CVTemplateProfessional` (mẫu CV thứ ba "Chuyên nghiệp": hai cột, cột trái nền
  Mực đen có ảnh; in bằng `@page cv-pro` lề 0 khai báo sau `@page` chung trong CVExportModal.module.css, nền cột trái
  `position: fixed` khi in, thead / tfoot lặp khoảng trống mỗi trang; chi tiết design.md "Xuất CV: 3 mẫu"),
  `utils/initials.js` (chữ viết tắt họ tên, tách từ AccountLayout), `middleware/avatar-upload.middleware.js` (backend).
  AccountLayout nhận thêm `summary.avatar` (chỉ ứng viên). Hai mẫu CV cũ thêm mục "Mục tiêu nghề nghiệp".
- T35l (không thêm component mới): `CVExportModal` thành Modal `wide` hai phần, chỉnh sửa bản in (state trong hộp:
  `makeDraft` / `applyDraft`, không API lưu, không localStorage) + xem trước sống (`CVPreview`); mẫu Chuyên nghiệp cột
  trái chỉ còn ảnh / họ tên / tiêu đề / Liên hệ, cột phải Mục tiêu -> Kỹ năng (thẻ) -> Kinh nghiệm -> Học vấn; Hiện đại
  kỹ năng dạng thẻ, cột 1:2. Chi tiết design.md "Xuất CV: 3 mẫu".
- Component T35j: `components/job/SkillTags` (nhãn kỹ năng, `max` + "+n"), `components/job/JobDescription` (JD tách
  phần, dùng ở chi tiết tin và chi tiết đối chiếu), `pages/auth/AuthLayout` (bố cục hai nửa cho Đăng nhập / Đăng ký /
  Quên / Đặt lại mật khẩu), `utils/skillLabel.js` (tách ghi chú trong ngoặc, gộp chip kỹ năng ở trang Hồ sơ).
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
| 9 Frontend | T26, T27, T28, T29, T29b, T30, T31, T32, T33, T34, T35, T35b, T35c, T35d, T35e, T35f, T35g, T35h, T35i, T35j, T35k, T35l | Xong |
| 9b Dữ liệu & chuẩn hóa | Task F: F1, F2, F4, F5 (giữ cụm "A/B" là tên Skill), tin mẫu theo phòng ban (F3 làm trước đó) | Xong (đã seed DB thật) |
| 9c Rà soát | QA1 (báo lỗi, `docs/qa-report.md`), QA2 (sửa theo QA1), QA3 (màn hình quản lý tin cho admin) | Xong |
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
  Trang Kết quả phân tích có khung "Cách hệ thống đọc CV của bạn" (từ QA-20 luôn thu gọn khi vào trang, bỏ "mở sẵn
  lần đầu" và localStorage), nhãn nguồn
  Từ điển / AI / Tự nhập (`PROFILE_SOURCE_LABEL` trong labels.js) + Đã / Chưa xác nhận; Chi tiết đối chiếu có chú thích
  3 trạng thái theo đúng matcher. Bỏ ô địa điểm ở trang chủ. Tài liệu `docs/cach-phan-tich-va-doi-chieu.md`.
  variables.css thêm `--account-mark-size`. Smoke test (file local) đã gửi `cvId` và có ca mới cho cvId / xóa CV / quyền xem.
  Migration `add_application_cv` đã chạy trên cvmatch (QA1 kiểm: 6 / 6 migration, 0 chờ).
- **T35h (đã xong, chủ dự án tự commit)**: chỉ viết lại câu chữ hiển thị (frontend, message API backend, email quên mật
  khẩu), không đổi logic / route / API / mã HTTP. Quy ước từ đây: gọi ứng viên là "bạn", HR / Admin trung tính; không
  "chúng tôi" (trừ Giới thiệu, Chính sách, Điều khoản); câu trọn vẹn có dấu chấm, nhãn / nút / tiêu đề không chấm; lỗi
  nói chuyện gì xảy ra + làm gì tiếp; viết hoa đầu câu. Thuật ngữ: Tin tuyển dụng, Đơn ứng tuyển, Rút đơn, Nhà tuyển dụng,
  Quản trị viên, "mô tả công việc" thay JD, "tỉ lệ (yêu cầu) có bằng chứng" thay coverage trên giao diện; trạng thái đơn
  Đã ứng tuyển / Đang xem xét / Đã chấp nhận / Đã từ chối; CV Đang phân tích / Phân tích lỗi. Message test trên máy
  (smoke, test-timeout, test-nlp-fail, test-real-mail) đã đổi theo câu mới.
- **Task F (đã xong, chủ dự án tự commit)**: tin mẫu `scripts/seed-demo-jobs.js` đổi thành 17 tin theo phòng ban
  (15 mở + 2 đóng, JD chỉ dùng tên / alias của seed, 114 yêu cầu đều gắn Skill khi tách bằng rule). Không trùng theo
  (tiêu đề + HR) như cũ; `--remove` xét cả tiêu đề tin mẫu bản trước (`LEGACY_DEMO_TITLES`, đã duyệt F5-A4; điều kiện
  xóa giữ nguyên: đúng HR, chưa có đơn, hỏi y/N). Từ F5 tin DevOps và UI/UX dùng CI/CD, UI/UX ở dòng yêu cầu
  (115 yêu cầu, đều gắn Skill). Tin cùng tiêu đề đã có
  thì bị bỏ qua (JD cũ giữ nguyên), muốn thay JD thì chạy `--remove` trước. Unit test chuẩn hóa (file local):
  `node --env-file=.env.test scripts/test-normalize.js`. DB thật đã chạy seed mới (QA1 kiểm: 133 Skill, 17 tin mẫu).
- **T35i (đã xong, chủ dự án tự commit)**: menu admin bỏ "Tạo nhà tuyển dụng" (nút "Tạo tài khoản nhà tuyển dụng" có sẵn trên
  trang danh sách, h1 và mục Sidebar đổi thành "Tài khoản người dùng", trang tạo có link "Quay lại danh sách tài khoản").
  Khu Tài khoản cho HR / Admin cùng bố cục với ứng viên, đặt trong MainLayout (mục 5); thẻ tóm tắt HR: chữ viết tắt,
  họ tên, email, Badge "Nhà tuyển dụng", tên công ty, "Hồ sơ đã có x/3 mục" (họ tên, số điện thoại, chức vụ); admin:
  chữ đầu email, email, Badge "Quản trị viên". Hồ sơ HR xem chỉ đọc lưới 2 cột + "Sửa thông tin"; Thông tin công ty cùng
  kiểu (tên luôn chỉ đọc); Hồ sơ admin chỉ đọc (Email, Vai trò; `GET /auth/me` không trả trạng thái). Sidebar tự tính
  mục sáng theo danh sách đường dẫn (`matches`). Trang Đơn ứng tuyển của HR: lựa chọn đầu "Tất cả tin của tôi" = không
  có `?jobId` (mặc định; `jobId` không phải tin của mình cũng về đây), dùng `GET /applications/mine` phân trang phía
  server 9 dòng, thêm cột "Tin tuyển dụng" (link trang sửa tin, "Đã đóng"); chọn một tin như cũ. Smoke có 6 ca mới cho
  `/applications/mine` (67 endpoint).
- **T35j (đã xong, chủ dự án tự commit)**: nâng giao diện ứng viên cho trang tuyển dụng công nghệ. Bảng đối chiếu chia nhóm
  theo loại, tiêu đề dòng là tên tiêu chí; chi tiết đối chiếu có kết quả tổng ở đầu (x/y + thanh + đếm 3 trạng thái),
  Badge trạng thái có chú thích một câu (`MatchStatusBadge`, thay khối "Cách đọc bảng này"), link "Cập nhật hồ sơ" ở dòng Không tìm thấy, JD dùng `JobDescription`. Chip kỹ năng Hồ sơ
  theo tên Skill / tên bỏ ngoặc + ghi chú nhỏ, gộp trùng (chỉ hiển thị). Tab Gợi ý: tin 0 bằng chứng xuống nhóm cuối
  thu gọn, số trên tab chỉ đếm tin có bằng chứng. Đơn ứng tuyển: một nút "Xem đối chiếu" (bỏ hộp bảng đối chiếu);
  "Lúc ứng tuyển" giữ dạng % vì Application chỉ lưu coverage, không lưu x/y. API tin có skills / topSkills / tìm theo
  kỹ năng (mục 4.1). Thẻ tin có nhãn kỹ năng, tóm tắt 1 dòng; trang chủ có "Tìm nhanh" + khối "Quy trình ứng tuyển";
  chi tiết tin có khung "Thông tin chung". Trang auth chung bố cục hai nửa (`AuthLayout`). Kết quả phân tích CV: bảng
  kỹ năng gọn, "Chưa xác nhận" trước, "Xác nhận tất cả" (gọi tuần tự API cập nhật có sẵn), bằng chứng thu gọn. Bảng câu
  đã bỏ / rút lưu ngoài repo (báo cáo T35j).
- **T35k (đã xong, chủ dự án tự commit)**: ảnh đại diện ứng viên (mục 4.3), mục tiêu nghề nghiệp (mục 4.4), mẫu CV thứ ba
  "Chuyên nghiệp", hai mẫu cũ thêm mục mục tiêu, hộp Xuất CV có dòng nguồn dữ liệu kèm link Hồ sơ / Kết quả phân tích CV,
  /privacy thêm ảnh đại diện và mục tiêu vào danh sách dữ liệu thu thập. Migration
  `20261117090000_add_candidate_avatar_objective` đã chạy trên cả DB test và cvmatch (QA1 kiểm).
- **T35l (đã xong, chủ dự án tự commit)**: CV xuất ra gọn một trang (hồ sơ cỡ trung bình ở cả 3 mẫu, kiểm bằng PDF thật), mẫu
  Chuyên nghiệp sắp lại hai cột, kỹ năng dạng thẻ / một dòng, chống tiêu đề mồ côi và trang trống; hộp Xuất CV có
  phần chỉnh sửa cho lần xuất này (KHÔNG lưu: không kéo thả, không sửa nội dung từng mục kinh nghiệm / học vấn); mở
  rộng tiêu đề mục tiêu + log lý do (mục 4.4). Không thêm thư viện, trường DB, endpoint.
  Phần B (kiểm bằng PDF thật, DB test, rule): tối giản / trung bình 1 trang, nhiều dữ liệu (30 kỹ năng, 5 kinh nghiệm
  x 5 ý, 3 học vấn, mục tiêu 1000 ký tự) 2 trang ở cả 3 mẫu. Để đạt 2 trang, mẫu Chuyên nghiệp đổi biến:
  `--cv-side-width` 32%, `--cv-page-space` 10mm, `--cv-gutter` 8mm, thêm `--cv-leading` 20px. Khung xem trước có
  nút "Vừa khung" / "Cỡ thật" (vừa khung chữ chỉ ~5-7px, không đọc được). Kịch bản kiểm thử nằm ngoài repo.
- **QA2 (sửa theo QA1, chưa commit)**: backend như các dòng "QA2" ở mục 4.2, 4.3, 7. Frontend: đăng nhập quay lại
  trang trước (QA-03); trang Đơn ứng tuyển của ứng viên lọc trạng thái trên URL `?status=` (QA-33); đổi bộ lọc ở Đơn
  ứng tuyển / Ứng viên gợi ý của HR và ứng viên thêm mục lịch sử (không `replace`) nên Back bỏ bộ lọc vừa chọn (QA-14);
  hộp ứng tuyển: CV phân tích lỗi VẪN gửi kèm được (QA-35, giữ quy tắc T35g), chọn CV đó thì dưới CV hiện "CV này chưa
  phân tích được nên không cập nhật vào hồ sơ. Bạn vẫn gửi kèm đơn được." (thay câu "Hồ sơ của bạn chưa được cập nhật từ
  CV này."); form Đăng ký có `maxLength` họ tên 255 / email 191. Danh sách mã đã sửa / bỏ qua: `docs/qa-report.md`.
- **QA3 (chưa commit)**: phần giao diện của QA-01, route `/admin/jobs` (mục 4.2 và 5). Không thêm endpoint: mở rộng
  quyền + response của `GET /jobs/my`. Cùng task: QA-20 (khung hướng dẫn ở Kết quả phân tích luôn thu gọn), QA-24
  (`parsedAt` chỉ ghi khi phân tích thành công, mục 4.4), QA-25 (giới hạn đăng ký + so bcrypt giả, mục 4.3), QA-27
  (không bật `trust proxy`, hoãn tới khi triển khai, mục 4.3 và 9). Kiểm thêm: `scripts/test-qa3.js` (file local, tự bật
  server test nhiều lần, cổng 5001 phải trống).
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
- Các file test (`backend/scripts/lib/`, `smoke-test.js`, `test-*.js` trừ `test-extract.js`) và
  `find-orphan-uploads.js` nằm trong .gitignore, chỉ lưu trên máy. Sao lưu thư mục `backend/scripts` ra ngoài sau mỗi
  lần sửa.
- **Thư mục upload riêng cho DB test (QA2, QA-05)**: `.env.test` / `.env.test.example` đặt `UPLOAD_DIR="uploads-test"`
  (trong `backend/.gitignore`); `.env` thật giữ `uploads`. Tìm file mồ côi (không có bản ghi `CV.filePath` /
  `CandidateProfile.avatarPath` trỏ tới): `node --env-file=.env.test scripts/find-orphan-uploads.js` (chỉ liệt kê),
  thêm `--quarantine` để CHUYỂN (không xóa) vào `<UPLOAD_DIR>/_mo_coi/<ngày>/` sau khi hỏi y/N. Script chỉ đọc DB, không
  có lệnh xóa file, bỏ qua file sửa trong 60 phút gần nhất, không cho cách ly khi DB test trỏ vào thư mục `uploads`.
  Chạy trên DB thật (dùng `.env`) do chủ dự án tự chạy, sao lưu `uploads` trước.
- Báo cáo rà soát: `docs/qa-report.md` (QA1 báo lỗi, QA2 thêm cột Trạng thái từng mã lỗi).
- Nhánh "admin cuối cùng" là lớp bảo vệ dự phòng, không kích hoạt được qua API.
- **`.env.test` BẮT BUỘC khai báo `COMPANY_NAME`** (như `.env.test.example`; từ F5 đã có, cùng tên với `.env`:
  "Công Ty TNHH DTSOFTWARE"). Thiếu thì dotenv trong env.js nạp bù từ `.env` và server test / seed đổi tên công ty
  trong DB test theo `.env`.
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
Triển khai sau Nginx / proxy: bật `app.set('trust proxy', <số tầng proxy>)` trong `app.js` (QA-27, hiện không bật).

## 10. Chuẩn bị ngày bảo vệ

- Dùng API key Gemini riêng cho demo (project riêng), cân nhắc bật billing kèm giới hạn ngân sách.
- Chuẩn bị sẵn dữ liệu đã phân tích để dự phòng khi Gemini hết hạn mức (chuyển NLP_MODE=rule).
- Tập demo một lần khi ngắt Wi-Fi thật (font tự host nên vẫn đúng dấu; Gemini và mail sẽ không chạy).
- Không chạy test vào ngày bảo vệ.