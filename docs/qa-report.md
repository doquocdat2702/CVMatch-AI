# QA1 — Rà soát toàn hệ thống trước T36

Ngày chạy: 12/11/2026. Phạm vi: đọc code (A), API tự động trên DB test `cv_matching_test` ở chế độ `NLP_MODE=rule` (B),
giao diện tự động bằng Chrome headless trên DB test (C), đọc dữ liệu thật `cvmatch` chỉ bằng truy vấn đọc (D).

- Task này **không sửa code**. Mọi lỗi dưới đây chờ chủ dự án duyệt rồi sửa ở task sau.
- Không gọi Gemini bằng key thật. `test-nlp-fail` có một giai đoạn dùng key giả do chính script đặt sẵn.
- Không gửi mail, không in mật khẩu hay email thật.
- Ảnh và log nằm ngoài repo, trong thư mục: `C:\Users\Admin\AppData\Local\Temp\claude\91d02647c8b44b6e\83d66db2-b25c-49a7-932e-5935d5cdd688\scratchpad\qa1\`
  (sau đây gọi là `qa1\`). Ảnh nằm trong `qa1\shots\`.

## 1. Tóm tắt

- **Không có lỗi chặn luồng chính** của ứng viên, nhà tuyển dụng và quản trị viên khi dùng bình thường:
  - 39 bước bấm thật đều làm được việc; 8 bước báo hỏng là do bộ chọn của script, chạy lại với đúng tên nút thì đạt.
  - 162 lượt mở trang (54 route × 3 độ rộng) không tràn ngang, không lỗi JS, không cảnh báo React, không request 4xx / 5xx ngoài dự kiến.
- **1 lỗi Chặn** cho một nhiệm vụ đã ghi trong CLAUDE.md: admin không đóng / sửa được tin của nhà tuyển dụng đã nghỉ (QA-01).
- **4 lỗi Nặng**:
  - Thiếu kiểm độ dài nên lỗi 500 lộ chi tiết Prisma ra giao diện (QA-02).
  - Mở URL sâu khi chưa đăng nhập: đăng nhập xong không quay lại trang đó (QA-03).
  - "Ứng viên gợi ý" còn tài khoản đã khóa hoặc đã đổi vai trò (QA-04).
  - DB thật và DB test dùng chung thư mục `uploads` (QA-05).
- Còn lại 13 lỗi Nhẹ và 12 Góp ý.

## 2. Bảng lỗi (sắp theo mức độ)

Mức độ: **Chặn** = người dùng không hoàn thành được việc; **Nặng** = sai nghiệp vụ / bảo mật / dữ liệu, có cách
né; **Nhẹ** = sai nhỏ, ít gặp; **Góp ý** = không sai nhưng nên cải thiện.

| Mã | Mức độ | Mô tả | Cách tái hiện | File liên quan | Đề xuất sửa |
|---|---|---|---|---|---|
| QA-01 | Chặn | Admin không đóng / sửa được tin và không đổi được trạng thái đơn của nhà tuyển dụng khác. CLAUDE.md 4.2 ghi "Admin toàn quyền", "HR nghỉ việc: admin tự sửa/đóng job của họ". `assertCanManageJob` có nhánh ADMIN nhưng route chặn trước, nên nhánh này không bao giờ chạy. HR nghỉ việc (bị khóa) thì tin của họ mở mãi; cách né duy nhất là admin đặt lại mật khẩu rồi đăng nhập thay HR. | Admin gọi `PATCH /api/jobs/:id/close` hoặc `PATCH /api/applications/:id/status` → 403 "Không có quyền thực hiện thao tác này." (B3, nhóm Luồng). Giao diện admin cũng không có trang quản lý tin. | `backend/src/modules/job/job.route.js` (`recruiterOnly`), `application/application.route.js`, `job/job.service.js:48` | Cho ADMIN qua các route sửa / đóng / xóa tin, sửa yêu cầu, đổi trạng thái đơn (`authorize('RECRUITER','ADMIN')`; service đã sẵn nhánh ADMIN). Cần chủ dự án quyết định có thêm màn hình admin xem tin hay không (ngoài phạm vi hiện tại). |
| QA-02 | Nặng | Backend không kiểm độ dài chuỗi cho các cột `VarChar`. Chuỗi quá dài → Prisma lỗi → **500**, và ở `NODE_ENV=development` message trả về chứa đường dẫn file và đoạn code backend; giao diện in nguyên văn. Trang Đăng ký **không có `maxLength`** nên người dùng gặp được ngay. Các form khác có `maxLength` ở frontend nên chỉ gặp khi gọi API trực tiếp. | Trang Đăng ký: nhập họ tên 300 ký tự → thông báo "Invalid `tx.candidateProfile.create()` invocation in D:\CVMatch-AI\backend\src\...". API (B3): `POST /auth/register` (họ tên 300, email 201 ký tự), `PUT /candidates/me` (phone 80, headline 300), `POST /candidates/me/skills|experiences|educations`, `POST /jobs` (tiêu đề 300), `POST /admin/recruiters` (phone 80), `PUT /companies/me` (địa chỉ 300), `POST /cvs/upload` (tên file 364 ký tự) đều 500. Ảnh: `qa1\shots\loi-dang-ky-ten-dai-500.png`. | `auth.service.js`, `candidate.service.js`, `candidate.items.service.js`, `job.service.js`, `admin.service.js`, `company.service.js`, `cv.service.js` (`createCv`), `error.middleware.js`, `frontend/src/pages/auth/Register.jsx` | Thêm kiểm độ dài ở service (400 + câu tiếng Việt), cắt / báo lỗi tên file > 255. Trong `error.middleware` đổi lỗi Prisma `P2000` (giá trị quá dài) thành 400, và không trả message Prisma thô kể cả khi chạy development. Thêm `maxLength` cho form Đăng ký. |
| QA-03 | Nặng | Mở URL cần đăng nhập khi chưa đăng nhập: đăng nhập xong về trang mặc định của vai trò, không quay lại trang đã mở. Trái với CLAUDE.md 4.3 "Đăng nhập xong quay lại trang trước". Riêng luồng "Ứng tuyển ngay" chạy đúng vì truyền `from` riêng. Phiên hết hạn (401) cũng chuyển thẳng `/login`, mất trang đang làm. | Chưa đăng nhập, mở `/candidate/applications` → `/login` → đăng nhập → về `/`. HR mở `/recruiter/applications?jobId=…&status=REVIEWING` → về `/recruiter/dashboard`. Ảnh: `qa1\shots\loi-url-sau-mat-sau-dang-nhap.png`. | `frontend/src/routes/ProtectedRoute.jsx` (`<Navigate to="/login" replace />` không có `state`), `frontend/src/api/axiosClient.js:38` | `<Navigate to="/login" replace state={{ from: location.pathname + location.search }} />`. Ở axiosClient, chuyển `/login` kèm đường dẫn hiện tại (ví dụ lưu `sessionStorage` hoặc query) để Login đọc như `from`. |
| QA-04 | Nặng | "Ứng viên gợi ý" lấy **mọi** `CandidateProfile` có CV đã phân tích: gồm cả tài khoản **đã bị khóa** và tài khoản **đã đổi sang nhà tuyển dụng** (hồ sơ ứng viên cũ không bị xóa khi đổi vai trò). HR vẫn xem được hồ sơ và đối chiếu của những người này. | B3: khóa ứng viên → vẫn có trong `GET /matching/recommended-candidates/:jobId`; đổi một ứng viên sang RECRUITER → vẫn hiện như ứng viên. Ảnh: `qa1\shots\loi-goi-y-con-tai-khoan-da-doi-role.png` ("Ứng viên uv3" đã là nhà tuyển dụng). | `backend/src/modules/ai/recommendation/recommend.service.js` (`recommendCandidatesForJob`) | Lọc `user: { isActive: true, role: { name: 'CANDIDATE' } }`. Cân nhắc lọc tương tự ở `GET /candidates/:id` và `GET /matching/job/:jobId/candidate/:candidateId` phía HR. |
| QA-05 | Nặng | `.env.test` dùng `UPLOAD_DIR="uploads"`, cùng thư mục với DB thật. Mỗi lần test (smoke dùng CV trong `samples/`, tức CV thật) đều ghi file vào thư mục server thật dùng. Reset DB test chỉ xóa bản ghi, không xóa file, nên file test thành file mồ côi lẫn với file thật. | Mục D5: thư mục có 171 file, `cvmatch` chỉ có 1 CV, DB test có 13 CV; **157 file không thuộc DB nào**. Bản thân QA1 cũng thêm vài file. | `backend/.env.test` (`UPLOAD_DIR`), `backend/scripts/smoke-test.js` (reset) | Đặt `UPLOAD_DIR="uploads-test"` trong `.env.test` (và `.env.test.example`); reset DB test thì dọn luôn thư mục đó. Chủ dự án sao lưu rồi dọn 157 file mồ côi trong `backend/uploads` (danh sách lấy bằng script D, `qa1\d-readonly.js`). |
| QA-06 | Nhẹ | Tham số `limit` không có trần ở `GET /jobs`, `GET /applications/mine`, `GET /admin/users`, `GET /notifications`: gửi `limit=100000` thì server trả `limit=100000`, đọc cả bảng một lần. | B3, nhóm Biên: 4 ca "có trần". | `job.service.js` (`listOpenJobs`), `application.service.js:331`, `admin.service.js` (`listUsers`), `notification.service.js` | Chặn `Math.min(limit, 50)` như `recommend.service.js` đã làm. |
| QA-07 | Nhẹ | Từ khóa tìm tin chứa `%` hoặc `_` thành ký tự đại diện của LIKE: tìm "%" ra mọi tin. | `GET /api/jobs?keyword=%25` → trả đủ tổng số tin. | `job.service.js` (`listOpenJobs`, `contains`) | Escape `%`, `_`, `\` trước khi đưa vào `contains`. |
| QA-08 | Nhẹ | Mã số vượt giới hạn INT (ví dụ `/jobs/9999999999999999999999`) → 500 thay vì 400 / 404. `Number.isInteger` nhận số lớn hơn 2^31. | `GET /api/jobs/9999999999999999999999` → 500 kèm message Prisma. | Các hàm `parseId` (job, application, cv, admin, ai…) | Thêm điều kiện `id <= 2147483647`. |
| QA-09 | Nhẹ | Body JSON hỏng trả 400 với câu tiếng Anh "Unexpected end of JSON input"; body > 100 KB trả 413 "request entity too large". Mô tả công việc dài hơn khoảng 100 KB không lưu được, dù cột là LongText. | B3: 2 ca Biên. | `backend/src/app.js` (`express.json()` mặc định 100 KB), `error.middleware.js` | Dịch hai lỗi này trong error middleware (`entity.parse.failed`, `entity.too.large`); cân nhắc `express.json({ limit: '1mb' })`. |
| QA-10 | Nhẹ | Đường dẫn API không tồn tại trả trang HTML 404 mặc định của Express, không phải JSON `{ success, message }`. | `GET /api/khong-co-duong-dan-nay` → `text/html`. | `backend/src/app.js` | Thêm middleware 404 dạng JSON trước `errorMiddleware`. |
| QA-11 | Nhẹ | Trường website của công ty nhận mọi chuỗi, kể cả `javascript:alert(1)`. Footer và trang Giới thiệu đã chặn: chỉ thành link khi bắt đầu bằng http(s), nên không có XSS; nhưng footer vẫn in nguyên chuỗi rác. | `PUT /api/companies/me {"website":"javascript:alert(1)"}` → 200. Footer hiện chữ "javascript:alert(1)" (`qa1\shots\c1-candidate-view_recommended-1280.png`; dữ liệu thử đã trả lại hợp lệ ở C3). | `company.service.js` (`updateMyCompany`) | Chỉ nhận URL `http://` hoặc `https://`, sai thì 400. |
| QA-12 | Nhẹ | Xóa tin chạy hai lệnh rời (xóa yêu cầu rồi xóa tin), không gói transaction. Nếu đúng lúc đó có người nộp đơn thì lệnh sau lỗi khóa ngoại (500) và tin mất hết yêu cầu. | Đọc code (A3). | `job.service.js:304-319` (`deleteJob`) | Gói trong `prisma.$transaction`, bắt `P2003` trả câu "Tin tuyển dụng đã có đơn…". |
| QA-13 | Nhẹ | `extractCvText`: lỗi bất ngờ (không phải lỗi đã định nghĩa) được lưu thẳng `err.message` vào `CV.errorMessage` rồi hiện cho ứng viên. Phần phân tích (`parseFailureMessage`) đã tránh việc này. Ngoài ra CV kẹt `PROCESSING` (server tắt giữa chừng) không bấm "Phân tích lại" được (400), chỉ còn cách xóa CV. | Đọc code (A3, A5). DB thật hiện không có CV kẹt (D3). | `cv.service.js:231-274` | Dùng cùng cách của `parseFailureMessage`; cho trích xuất lại khi `PROCESSING` quá N phút. |
| QA-14 | Nhẹ | Trang Đơn ứng tuyển và Ứng viên gợi ý của HR đổi bộ lọc bằng `replace`: bấm Back rời khỏi trang thay vì bỏ bộ lọc vừa chọn. Trang chủ và trang Tài khoản người dùng (admin) thì Back bỏ từng bộ lọc. F5 vẫn giữ bộ lọc. | HR: chọn tin → chọn trạng thái → Back → về Tổng quan. Ảnh: `qa1\shots\c45-11.png`. | `frontend/src/pages/recruiter/Applications.jsx:149`, `RecommendedCandidates.jsx:94` | Bỏ `{ replace: true }` khi người dùng tự đổi bộ lọc (giữ `replace` khi tự sửa trang vượt quá). |
| QA-15 | Nhẹ | Vùng bấm dưới 44px ở 375px trên trang khách / ứng viên (T35f đặt 44px cho SiteLayout): link ở footer cao 23px, Logo 28px, dòng "Bằng chứng trong CV" (ParsedCV) 18px, link "Quay lại…" 21px, ô nhập và nút trang Đăng nhập / Đăng ký / Quên mật khẩu 40px. | C1, bảng tổng hợp vùng bấm (`qa1\c12-report-all.json`, trường `small`). | `SiteFooter.module.css`, `Logo.module.css`, `ParsedCV.module.css` (`.evidenceToggle`), `MatchingDetail.module.css` (`.backLink`), `Auth.module.css` | Thêm `min-height: var(--touch-target)` dưới 900px cho các mục trên. |
| QA-16 | Nhẹ | Smoke chạy kèm reset (lượt 1) hỏng 4 ca rate limit: bộ đếm phía server thấp hơn số lần test gửi ("-2 lượt"). Chạy lại không reset thì 268/268. Nghi `localhost` lúc ra IPv4 lúc ra IPv6, nên express-rate-limit đếm thành hai khóa; nếu đúng thì trên máy chạy cả IPv4 / IPv6 một IP có thể thử gấp đôi. | `npm run test:smoke` (log `qa1\b1-smoke.txt`, ca 265–268); lượt 2 `qa1\b1-smoke-lan2.txt`. | `backend/scripts/smoke-test.js` (`http://localhost`), `rate-limit.middleware.js` | Smoke gọi `127.0.0.1` thay vì `localhost`; chạy lại vài lần để xác nhận nguyên nhân trước khi sửa. |
| QA-17 | Nhẹ | Tài liệu lệch thực tế. `docs/cach-phan-tich-va-doi-chieu.md` dòng 287 còn ghi "Lưu ý: hồ sơ của bạn…" (T35j đã bỏ "Lưu ý:"). CLAUDE.md: mục Task F ghi "DB thật CHƯA chạy seed mới", nhưng `cvmatch` đã có 133 Skill và 17 tin mẫu (15 mở, 2 đóng); mục T35g ghi "DB thật chưa có migration `add_application_cv`", nhưng migration đã chạy (D3). | Đọc tài liệu + mục D. | `docs/cach-phan-tich-va-doi-chieu.md`, `CLAUDE.md` mục 6 | Sửa câu cho đúng hiện trạng. |
| QA-18 | Nhẹ | Biến không dùng `roles` trong `findRoleByName` (một truy vấn thừa mỗi lần chọn vai trò sai). | `oxlint` backend (A3). | `backend/src/modules/admin/admin.service.js:34` | Xóa dòng truy vấn. |
| QA-19 | Góp ý | Trang "Yêu cầu tuyển dụng" của HR chỉ đổi được Loại và Xóa; muốn sửa tên tiêu chí hay số năm thì phải xóa rồi thêm lại, dù API `PUT /jobs/:id/requirements/:reqId` đã hỗ trợ. | C3: bước "Sửa yêu cầu (số năm)". Ảnh: `qa1\shots\c3-04-HR.png`. | `frontend/src/pages/recruiter/ParsedJD.jsx` | Thêm nút "Sửa" mở hộp như "Thêm yêu cầu thủ công". |
| QA-20 | Góp ý | Trang Kết quả phân tích CV: khung "Cách hệ thống đọc CV của bạn" mở sẵn lần đầu (4 bước + 1 câu), cộng thêm dòng nhắc "Dữ liệu được đọc tự động…": hơn một câu phụ trên một màn hình ứng viên (quy tắc T35j, CLAUDE.md mục 5). | `qa1\shots\c1-candidate-candidate_cvs_parsed-1280.png`. | `frontend/src/pages/candidate/ParsedCV.jsx` | Đóng khung hướng dẫn mặc định, hoặc bỏ dòng nhắc. |
| QA-21 | Góp ý | Chi tiết tin ở 375px: khoảng trống khoảng 150px giữa mô tả công việc và "Vị trí khác đang tuyển" (có thể là chỗ chừa cho thanh ứng tuyển dính đáy, nhưng nằm sai vị trí). Cần xem bằng mắt trên điện thoại. | `qa1\shots\c1-candidate-jobs_12-375.png`. | `frontend/src/pages/candidate/JobDetail.module.css` | Chuyển khoảng chừa xuống cuối trang (`padding-bottom` của trang). |
| QA-22 | Góp ý | Bảng Tài khoản người dùng (admin) bẻ email dài giữa chừng ở 1280px (email smoke rất dài) và ở 375px. Đọc vẫn được. | C1: `qa1\shots\c1-admin-admin_users_role_CANDIDATE-1280.png`. | `frontend/src/pages/admin/AccountList.module.css` | Chấp nhận, hoặc cho cột email rộng hơn / bẻ sau dấu `@`. |
| QA-23 | Góp ý | Gợi ý việc làm / ứng viên gọi matcher cho từng tin / từng ứng viên, mỗi lần 2 truy vấn: N tin → 2N truy vấn. Đủ nhanh với dữ liệu demo; chậm khi có hàng trăm ứng viên. "Xác nhận tất cả" gọi API tuần tự từng kỹ năng (có chủ đích ở T35j vì không được thêm endpoint). | Đọc code (A3, A4). | `recommend.service.js`, `matcher.js`, `ParsedCV.jsx:450` | Ghi vào hướng phát triển (nạp hồ sơ / yêu cầu theo lô). |
| QA-24 | Góp ý | `CV.status = COMPLETED` và `parsedAt` được đặt ngay sau bước **trích xuất chữ**, trước bước phân tích. Ứng viên gọi API trích xuất mà không phân tích thì vẫn ứng tuyển được; câu "hồ sơ chưa cập nhật từ CV này" (dựa vào `parsedAt` mới nhất) có thể sai. Giao diện luôn chạy cả hai bước nên người dùng bình thường không gặp. | Đọc code `cv.service.js:253-260`. | `cv.service.js`, `application.service.js:116` | Ghi rõ trong tài liệu, hoặc chỉ đặt `parsedAt` ở bước phân tích. |
| QA-25 | Góp ý | Đăng ký báo "Email này đã được dùng…" và đăng nhập không so mật khẩu giả khi email không tồn tại (nhanh hơn rõ rệt), nên có thể dò email đã đăng ký. `/auth/register` không có rate limit. | Đọc code `auth.service.js`. | `auth.service.js`, `auth.route.js` | Thêm rate limit cho đăng ký; so bcrypt giả khi email không tồn tại. |
| QA-26 | Góp ý | Đổi mật khẩu không vô hiệu token cũ (token cũ dùng tiếp tới khi hết hạn 1 ngày). Đã ghi là hướng phát triển (tokenVersion, CLAUDE.md mục 9). | B3: "Sau khi đổi mật khẩu, token cũ" → 200. | `auth.middleware.js` | Giữ ở mục Hướng phát triển. |
| QA-27 | Góp ý | Chưa đặt `app.set('trust proxy', …)`: nếu triển khai sau proxy / Nginx thì rate limit tính theo IP của proxy (mọi người dùng chung một bộ đếm). Chạy máy local thì không ảnh hưởng. | Đọc code `app.js`. | `backend/src/app.js` | Ghi chú triển khai; đặt `trust proxy` khi có proxy. |
| QA-28 | Góp ý | Nhóm giao diện HR / Admin ở 375px có nhiều nút 32–40px (nút trong bảng, ô chọn, nút Hiện / Ẩn). Design chưa đặt mục tiêu 44px cho MainLayout nên không tính là lỗi. | C1, trường `small` của vai trò recruiter / admin. | Các CSS module của `pages/recruiter`, `pages/admin` | Cân nhắc khi có thời gian. |
| QA-29 | Góp ý | DB thật: 7 kỹ năng (nguồn NLP, của 1 ứng viên) có `skillId = null` nhưng tên nay tra ra Skill có sẵn: dấu hiệu cần phân tích lại CV đó sau khi seed 133 Skill. | Mục D2. | (dữ liệu) | Chủ dự án bấm "Phân tích lại" CV đó ở chế độ hybrid. |
| QA-30 | Góp ý | PDF mở bằng "Xem CV" là object URL, nên tab mới không mang tên file gốc (trình xem PDF hiện mã ngẫu nhiên, lưu file ra tên ngẫu nhiên). Chrome headless chuyển PDF thành tải về, nên phần này cần xem bằng mắt trên Chrome / Edge thật. | C3 (API trả đúng `200 application/pdf`; tab headless tải file `…uuid….pdf`). | `frontend/src/utils/cvFile.js` | Chấp nhận, hoặc mở trực tiếp `GET /cvs/:id/file` có `Content-Disposition` tên gốc (cần cơ chế xác thực khác bearer). |

## 3. Bảng phủ kiểm

Số "hỏng" dưới đây là số ca script báo, đã trừ ca báo nhầm (ghi trong cột Ghi chú).

| Mục | Nội dung | Số ca | Đạt | Hỏng | Ghi chú |
|---|---|---|---|---|---|
| A1 | Code so với CLAUDE.md mục 4 (một công ty, phân quyền, bảo mật, NLP) | 4 mục, khoảng 40 quyết định | — | 2 lệch + 3 tài liệu cũ | Lệch: QA-01 (admin toàn quyền), QA-03 (quay lại trang trước). Tài liệu cũ: QA-17. Còn lại khớp: công ty cố định, `PUT /companies/me` bỏ qua tên, `isActive` đọc lại mỗi request, khóa / hạ admin cuối, xóa tài khoản có dữ liệu → 400, đổi role tự tạo hồ sơ, quên mật khẩu chỉ ứng viên + token một lần, upload, rate limit, production ẩn 500, NLP_MODE, retry LLM. |
| A2 | Xác thực + quyền từng endpoint, kiểm chủ sở hữu | 69 route (đọc code), 64 endpoint × 4 danh tính (B3) | 69 | 0 | Không endpoint nào thiếu xác thực. Chủ sở hữu được kiểm ở CV, đơn, kỹ năng / kinh nghiệm / học vấn, thông báo, đối chiếu, tin (sửa riêng). Quyền HR xem ứng viên chưa ứng tuyển là có chủ đích (Ứng viên gợi ý), xem QA-04. |
| A3 | Lỗi lập trình thường gặp | 7 nhóm | 4 | 3 | Không thiếu `await`, không import vòng, không TODO / FIXME, `console.log` chỉ là log có chủ đích. Hỏng: biến không dùng (QA-18), thiếu transaction (QA-12), truy vấn theo vòng lặp (QA-23). oxlint còn báo `catch (err)` không dùng và tham số `next` của error middleware (bắt buộc với Express): bỏ qua. |
| A4 | Frontend: API trong vòng lặp, cleanup useEffect, key, link chết | 49 useEffect, mọi link nội bộ | — | 0 | 49 / 49 useEffect gọi API đều có cleanup; listener / interval đều dọn. 0 link tới route không tồn tại. Gọi API trong vòng lặp: chỉ "Xác nhận tất cả" (có chủ đích). |
| A5 | Bảo mật: upload, path traversal, rate limit, message lỗi, CORS, helmet | 6 nhóm | 4 | 2 | Upload kiểm đuôi + mimetype + magic bytes, 5 MB, tên UUID, file bị từ chối không để lại rác; `resolveCvFilePath` chặn đường dẫn ngoài thư mục upload; CORS theo danh sách, helmet bật. Hỏng: lộ message Prisma (QA-02), website nhận `javascript:` (QA-11). |
| A6 | `docs/cach-phan-tich-va-doi-chieu.md` so với matcher | Mục 8.1–8.4 | Khớp | 1 câu cũ | Bảng EXACT / PARTIAL / NONE, quy tắc số năm, coverage, gợi ý khớp code. Câu cũ: QA-17. |
| B1 | `npm run test:smoke` (reset DB test, chủ dự án đồng ý trong lượt chat) | 268 | 264 | 4 | 4 ca rate limit (QA-16); chạy lại không reset 268 / 268, 67 / 67 endpoint. |
| B2 | `test:timeout`, `test:nlp-fail` | 8 + 61 | 69 | 0 | |
| B3 | Script mới `backend/scripts/test-qa1-api.js` | 356 | 330 | 26 | Quyền 255 / 256 (1 ca kỳ vọng sai: ứng viên xem đối chiếu của mã ứng viên khác thì 403 là đúng); Biên 29 / 50; Luồng 33 / 37; Upload 12 / 13. Mọi ca hỏng thuộc QA-01, 02, 04, 06–11. |
| C1 | Mọi route × 4 vai trò × 1280 / 900 / 375 | 162 | 162 không tràn | — | Tràn ngang: 0. Chữ đè chữ: 0 lỗi thật (các cảnh báo tự động là bảng dữ liệu ẩn cho trình đọc màn hình, nội dung `<details>` đang đóng, thanh ứng tuyển dính đáy; đã xem ảnh). Bẻ chữ: chỉ email dài (QA-22). Nút bị cắt: 0. Vùng bấm < 44px: QA-15, QA-28. |
| C2 | Lỗi console / request trên mọi trang | 162 lượt mở trang + các bước C3 | 162 | 0 | 0 lỗi JS, 0 cảnh báo React, 0 request 4xx / 5xx ngoài dự kiến. |
| C3 | Luồng bấm thật 4 vai trò | 39 + 8 chạy lại | 39 | 0 lỗi thật | Lượt đầu 8 hỏng đều do script (tên nút "Đóng" / "Khóa" / "Xóa", đếm trước khi trang tải, đọc URL tab mới quá sớm); chạy lại đạt. Ghi nhận: QA-19, QA-30. |
| C4 | Back / Forward, F5, URL sâu, URL của role khác | 18 | 15 | 3 | Hỏng thật: QA-03 (2 ca), QA-14. URL của role khác → `/403`: 8 / 8. F5 giữ trạng thái ở trang chủ, tab Gợi ý, Tài khoản người dùng (admin). Lượt đầu script báo 7 hỏng: 3 ca Back ở trang chủ và 1 ca admin là kỳ vọng của script sai (đã kiểm riêng: ô tìm và ô vai trò đồng bộ đúng với URL khi Back / Forward). |
| C5 | Tab qua form, viền focus, Esc, nhãn | 87 | 87 | 0 lỗi thật | 7 cảnh báo đều báo nhầm: viền focus vẽ ở `::after` / `:focus-within`; ô chọn file ẩn có nút mở riêng; link trong `<details>` đóng. Esc đóng mọi hộp thoại và menu; focus vào trong hộp khi mở. |
| D1 | Tin đang mở đã có yêu cầu gắn Skill | 15 tin | 15 | 0 | Mọi tin mở đều có yêu cầu, mọi yêu cầu đều có `skillId`. |
| D2 | `CandidateSkill.skillId` null mà tên tra ra Skill | 16 mục | 9 | 7 | QA-29. |
| D3 | CV FAILED / PROCESSING treo; đơn `cvId` null | 1 CV, 2 đơn | — | — | 0 FAILED, 0 PROCESSING treo. 1 đơn `cvId` null (đơn cũ trước T35g, đúng thiết kế). Migration `add_application_cv` đã chạy. |
| D4 | HR thiếu công ty; user thiếu / thừa hồ sơ theo role | 3 user | 3 | 0 | 1 admin đang hoạt động, 0 HR thiếu công ty, 0 hồ sơ lệch role. |
| D5 | File trong `uploads/` so với bản ghi CV | 171 file, 1 CV thật | — | 157 mồ côi | 0 bản ghi mất file, 0 đường dẫn ra ngoài thư mục. QA-05. |

## 4. Việc chủ dự án tự làm

1. **Cần Gemini (chế độ hybrid)**:
   - Phân tích lại CV của ứng viên có 7 kỹ năng thiếu `skillId` (QA-29).
   - Kiểm phần kinh nghiệm / học vấn do AI đọc.
   - Chạy thử một JD có câu rule không phân loại được.
   - Xem lỗi 503 khi hết hạn mức bằng key thật.
2. **Cần gửi mail thật**: `node --env-file=.env.test scripts/test-real-mail.js <email>` (quên mật khẩu → mở link → đặt lại).
3. **Cần xem bằng mắt**:
   - "Xem CV" trên Chrome / Edge thật: PDF mở trong tab, tên tab (QA-30). DOCX tải về đúng tên gốc.
   - Hộp in "Xuất CV" thật (khổ A4, bỏ đầu trang / chân trang).
   - Chi tiết tin trên điện thoại thật: khoảng trống (QA-21), thanh ứng tuyển dính đáy không che chữ cuối trang.
   - Thử nhanh bằng trình đọc màn hình (NVDA) ở trang Đăng nhập, Kết quả phân tích CV, Chi tiết đối chiếu.
4. **Dữ liệu thật**:
   - Sao lưu rồi dọn 157 file mồ côi trong `backend/uploads`.
   - Tách thư mục upload cho DB test (QA-05).
5. **Duyệt danh sách lỗi** ở mục 2 để chọn lỗi sửa trong task sau.

## 5. Phụ lục: dữ liệu và file QA1 đã tạo

- **DB test `cv_matching_test`**:
  - Đã reset một lần qua `npm run test:smoke`, có đồng ý của chủ dự án trong lượt chat. Dữ liệu thử của T35i / T35j đã mất.
  - Sau đó thêm tài khoản và tin có hậu tố `qa1…`, `ui…`, `c3…` (ứng viên, nhà tuyển dụng, tin, đơn).
  - Website công ty đặt lại thành `https://dtsoftware.example.vn`.
  - Mật khẩu admin DB test được đổi rồi **đổi lại như cũ** (đăng nhập lại thành công).
- **DB thật `cvmatch`**: chỉ đọc. Script bọc Prisma, chặn mọi thao tác ghi; chỉ in mã số và số đếm.
- **Thư mục `backend/uploads`** (dùng chung, xem QA-05): QA1 thêm một số file CV tự tạo (PDF / DOCX mẫu, không phải CV thật).
- **File test mới**: `backend/scripts/test-qa1-api.js` (nằm trong `.gitignore`). Đã sao lưu `backend/scripts` ra `qa1\backup\scripts-truoc-qa1` và `qa1\backup\scripts-sau-qa1`.
- **Script và log ngoài repo** (`qa1\`):
  - Log: `b1-smoke.txt`, `b1-smoke-lan2.txt`, `b2-timeout.txt`, `b2-nlpfail.txt`, `b3-api.txt` / `.json`, `c12.txt`, `c3.txt`, `c45.txt`.
  - Kết quả mục D: `d-cvmatch.json`.
  - Script: `c-setup.js`, `c12-crawl.js`, `c3-flows.js`, `c3-retry.js`, `c45.js`, `d-readonly.js`.
- **Không sửa file code nào trong repo.** Ngoài file báo cáo này và file test mới, git status giữ nguyên như trước QA1 (các thay đổi T35j chưa commit).
