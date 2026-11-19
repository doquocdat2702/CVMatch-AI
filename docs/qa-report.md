# QA1 — Rà soát toàn hệ thống trước T36 (lượt 2) và QA2 — sửa lỗi

Ngày chạy: 18–19/11/2026, trên code đã commit tới T35l (`8f86dcf`).
Lượt 1 (12/11/2026, trước T35k) vẫn xem được trong lịch sử git của file này.

**Phạm vi**
- Đọc code (A).
- API tự động trên DB test `cv_matching_test` ở chế độ `NLP_MODE=rule` (B).
- Giao diện tự động bằng Chrome headless trên DB test (C).
- Đọc dữ liệu thật `cvmatch`, chỉ bằng truy vấn đọc (D).

**Quy tắc đã giữ**
- Task này **không sửa code**.
- Không gọi Gemini; `test-nlp-fail` dùng key giả do chính script đặt.
- Không gửi mail.
- Không in mật khẩu, key hay email thật. Email trong báo cáo đều là email thử `…@test.local`.

**Mã lỗi**
- Giữ nguyên mã QA-01…QA-30 của lượt 1 để tiện đối chiếu; lỗi mới đánh từ QA-31.
- Cột "Lượt 2" ghi: **Còn** (kiểm lại vẫn gặp), **Mới**, **Hết**, **Không tái hiện**.

Ảnh, log và script nằm ngoài repo, trong thư mục:
`C:\Users\Admin\AppData\Local\Temp\claude\91d02647c8b44b6e\83d66db2-b25c-49a7-932e-5935d5cdd688\scratchpad\qa1b\`
(sau đây gọi là `qa1b\`). Thư mục này có thể bị dọn khi khởi động lại máy, nên cần thì chép ra chỗ khác.

## 0. QA2: sửa theo danh sách lỗi (19/11/2026)

Phần này ghi kết quả task QA2. Mục 1–6 bên dưới giữ nguyên nội dung QA1 lượt 2 để đối chiếu. Riêng bảng lỗi (mục 2) có thêm cột **Trạng thái QA2**.

**Quy tắc đã giữ**
- Chưa commit.
- Không thêm thư viện, model, enum, trường DB, endpoint.
- Phần kiểm chỉ chạy trên DB test `cv_matching_test`, chế độ `NLP_MODE=rule`. Không gọi Gemini, không gửi mail, không đọc / ghi `cvmatch`.

### 0.1 Mã đã sửa

| Mã | Đã làm | Kiểm lại (B1) |
|---|---|---|
| QA-01 | Route sửa / đóng / xóa tin, phân tích JD, thêm / sửa / xóa yêu cầu, `GET /applications/job/:jobId`, `PATCH /applications/:id/status` cho `RECRUITER` và `ADMIN`. `assertCanManageJob` giữ nguyên (ADMIN đi qua không điều kiện). `listApplicationsForJob` nhận `req.user`: admin xem đơn của mọi tin. Phần giao diện làm ở QA3 (mục 0.6): `/admin/jobs` dùng lại danh sách, trang sửa, trang yêu cầu của HR. | Admin sửa, phân tích lại, thêm / sửa / xóa yêu cầu, xem đơn, đổi trạng thái (ứng viên nhận thông báo), xóa, đóng tin. HR bị khóa: admin vẫn đóng / sửa tin của HR đó. B3 nhóm Luồng: 2 ca QA-01 đã đạt. |
| QA-02 | `error.middleware.js`: Prisma `P2000` (chuỗi dài hơn cột) → 400 "Nội dung nhập quá dài. Vui lòng rút gọn rồi thử lại."; lỗi 5xx không xác định → câu chung ở **mọi** chế độ, log máy chủ vẫn đủ kèm stack. Tên file CV dài hơn 255 ký tự: cắt phần tên, giữ đuôi. Form Đăng ký có `maxLength` (họ tên 255, email 191). | 8 ca chuỗi quá dài (đăng ký, hồ sơ, kỹ năng, tin, tạo HR, công ty) → 400, không lộ code. Tên file 363 ký tự → 201, còn 255 ký tự. Ô Họ và tên chỉ nhận 255 ký tự. |
| QA-03 | `ProtectedRoute` chuyển `/login` kèm `state.from` (đường dẫn + query). `axiosClient` gặp 401 tải lại `/login?from=...`. Login đọc cả hai. Không quay lại `//...`, `/\...`, URL đầy đủ, chính `/login`, hay trang thuộc khu của vai trò khác (`roles.js: belongsToOtherRole`). | 3 vai trò mở URL có bộ lọc khi chưa đăng nhập → quay lại đúng URL. Hết phiên (token hỏng) ở trang ứng viên / HR → đăng nhập lại về đúng trang. C4: 2 ca QA-03 đã đạt. Ảnh: `qa2\shots\QA-03-da-sua-hr-quay-lai-dung-trang.png`. |
| QA-04 | `recommend.service.js`: lọc `user: { isActive: true, role: { name: 'CANDIDATE' } }` ngay trong truy vấn. | Khóa → mất khỏi gợi ý; đổi sang HR → mất; đổi lại → có lại. |
| QA-05 | `.env.test`, `.env.test.example`: `UPLOAD_DIR="uploads-test"` (thêm vào `backend/.gitignore`; `.env` thật không đổi). Script `backend/scripts/find-orphan-uploads.js` (trong `.gitignore`): mặc định chỉ liệt kê; `--quarantine` hỏi y/N rồi **chuyển** vào `_mo_coi/<ngày>/`; không có lệnh xóa file; chỉ đọc DB; bỏ qua file sửa trong 60 phút; đọc lại DB ngay trước khi chuyển; từ chối cách ly khi DB test trỏ vào `uploads`. | Smoke ghi file vào `uploads-test`; `uploads` của DB thật không thêm file nào. Kiểm script trên DB test: xem mục 0.3. |
| QA-31 | `cv.service.js: toCvView` bỏ `filePath`, `rawText` khỏi response tải lên, danh sách, chi tiết, trích xuất; thêm `textLength`. **Không màn hình nào cần toàn văn CV**, nên không còn API nào trả `rawText` của CV. Trường `rawText` của **yêu cầu tuyển dụng** (câu gốc trong JD) vẫn trả vì trang Yêu cầu và bảng đối chiếu hiển thị câu này. | 5 API CV không có `filePath` / `rawText`; 7 API phía HR / ứng viên / admin không có. |
| QA-06 | Trần `limit` 50 (`utils/ids.js: MAX_PAGE_SIZE`) cho tin, đơn của HR, tài khoản, thông báo. | `limit=100000` → 50 ở cả 4 API. |
| QA-07 | Escape `%`, `_`, `\` trước `contains` / `startsWith` / `endsWith` (tiêu đề, địa điểm, kỹ năng). | "%", "_", "%%", "\\" → 0 tin; "React" vẫn ra tin. |
| QA-08 | Mọi `parseId` từ chối mã > 2147483647 (`MAX_DB_ID`). | Mã rất lớn → 400; `/cvs/<rất lớn>/file` → 404. |
| QA-09 | JSON hỏng → 400 "Dữ liệu gửi lên không đúng định dạng. Vui lòng thử lại."; body quá 100 KB → 413 "Dữ liệu gửi lên quá lớn...". Giữ giới hạn 100 KB. | Đạt cả 2 ca. |
| QA-10 | `app.js`: `/api/...` không tồn tại → 404 JSON "Không tìm thấy đường dẫn API.". | Đạt; `/api/health` vẫn chạy. |
| QA-11 | Website công ty chỉ nhận `http://` / `https://`, sai → 400. | `javascript:`, không có giao thức, `ftp://`, `https://` trống → 400; địa chỉ https hợp lệ → 200 (đã trả lại giá trị cũ). |
| QA-12 | `deleteJob` xóa yêu cầu + tin trong `$transaction`, bắt `P2003` trả câu "đã có đơn". | Admin xóa tin chưa có đơn → 200; tin và yêu cầu không còn. |
| QA-13 | (Một phần) Trích xuất lỗi bất ngờ ghi câu chung vào `errorMessage`, không ghi message kỹ thuật. | Kiểm bằng đọc code (lỗi bất ngờ khó tạo qua API); các lỗi trích xuất đã định nghĩa vẫn ghi đúng câu (test-timeout 8 / 8). |
| QA-14 | Đơn ứng tuyển và Ứng viên gợi ý của HR đổi bộ lọc bằng push (bỏ `replace`), nên Back bỏ bộ lọc vừa chọn. | C4: 2 ca QA-14 đã đạt; Back sau khi chọn tin về "Tất cả tin của tôi", vẫn ở trang. |
| QA-17 | CLAUDE.md: T35j / T35k / T35l đã commit; `cvmatch` đã có đủ migration và seed mới; thêm dòng QA1 / QA2, `docs/qa-report.md`, các quyết định mới ở mục 4.2, 4.3, 7. Tài liệu phân tích bỏ chữ "Lưu ý:". | Đọc lại. |
| QA-18 | Xóa truy vấn thừa `roles` trong `findRoleByName`. | oxlint không còn báo. |
| QA-32 | `docs/cach-phan-tich-va-doi-chieu.md` thêm mục 5.1 Mục tiêu nghề nghiệp (danh sách tiêu đề, rule / hybrid, quy tắc chỉ điền khi trống, log lý do, hạn chế với CV nhiều cột) và một dòng ở mục 11. | Đọc lại. |
| QA-33 | Bộ lọc trạng thái trang Đơn ứng tuyển của ứng viên nằm trên `?status=`, đổi bằng push. | Chọn lọc → URL có `?status=APPLIED`; F5 giữ; Back bỏ lọc; giá trị lạ → Tất cả. Ảnh: `qa2\shots\QA-33-da-sua-loc-tren-url.png`. |
| QA-35 | Theo đề: **không chặn**. Hộp ứng tuyển: CV đang chọn ở trạng thái lỗi thì dưới CV đó có dòng nhỏ màu Chì "CV này chưa phân tích được nên không cập nhật vào hồ sơ. Bạn vẫn gửi kèm đơn được." (gắn `aria-describedby`; khi đó không hiện thêm câu "Hồ sơ của bạn chưa được cập nhật từ CV này."). | Có dòng nhắc khi chọn CV lỗi, không có khi chọn CV đã phân tích; nút Gửi vẫn bấm được; API vẫn nhận CV FAILED (201). Ảnh: `qa2\shots\QA-35-da-sua-dong-nhac-cv-loi.png`, `QA-35-hop-ung-tuyen-375.png`. |
| QA-36 | `avatarUploadLimiter`: 10 lần tải **thành công** / 15 phút / tài khoản (lần bị từ chối không tính) → 429 "Bạn đã đổi ảnh đại diện quá nhiều lần. Vui lòng thử lại sau 15 phút.". `swapAvatarPath` ghi `avatarPath` có điều kiện "vẫn là giá trị vừa đọc" (thử lại tối đa 5 lần, quá thì 409) và chỉ xóa đúng file vừa bị thay. | 3 lần sai loại + 10 lần đúng → 200; lần thứ 11 → 429; tài khoản khác vẫn tải được. 6 lần tải cùng lúc → đều 200, thêm đúng 1 file; 2 lần xóa cùng lúc → không còn file. |

### 0.2 Mã bỏ qua hoặc chuyển chủ dự án

| Mã | Trạng thái | Lý do |
|---|---|---|
| QA-01 (màn hình) | ~~Chuyển chủ dự án~~ **Đã sửa ở QA3** | QA2: admin chưa có màn hình xem / sửa tin, đề dặn báo lại. Chủ dự án giao QA3, xem mục 0.6. |
| QA-05 (dữ liệu thật) | Chuyển chủ dự án | Dọn file mồ côi trong `uploads` của DB thật do chủ dự án tự chạy script (mục 0.4). |
| QA-13 (CV kẹt PROCESSING) | Bỏ qua | Cho trích xuất lại sau N phút là đổi luật trạng thái CV (logic nghiệp vụ). DB thật hiện không có CV kẹt. |
| QA-15 | Bỏ qua | Sửa vùng bấm 44px ở 6 file CSS (footer, Logo, Auth, ParsedCV, MatchingDetail, ma trận), cần xem lại từng màn hình bằng mắt, không còn là "vài dòng". |
| QA-19 | Bỏ qua | Thêm nút / hộp sửa yêu cầu là chức năng giao diện mới. |
| QA-20 | ~~Chuyển chủ dự án~~ **Đã sửa ở QA3** | Chủ dự án chốt: khung luôn thu gọn, bỏ localStorage (mục 0.7). |
| QA-21 | Bỏ qua | Đổi bố cục khoảng chừa cho thanh ứng tuyển dính đáy, cần kiểm trên điện thoại thật. |
| QA-22 | Bỏ qua | Chấp nhận: email dài bẻ dòng vẫn đọc được. |
| QA-23 | Bỏ qua | Hướng phát triển (gộp truy vấn matcher). |
| QA-24 | ~~Chuyển chủ dự án~~ **Đã sửa ở QA3** | Chỉ phân tích thành công mới ghi `parsedAt` (mục 0.7). |
| QA-25 | ~~Chuyển chủ dự án~~ **Đã sửa ở QA3** | Giới hạn đăng ký 30 lần / giờ / IP + so bcrypt giả (mục 0.7). |
| QA-26 | Bỏ qua | Đã ở Hướng phát triển (CLAUDE.md mục 9). |
| QA-27 | **Hoãn tới khi triển khai** | Chủ dự án chốt không bật `trust proxy` khi chạy trực tiếp; đã ghi chú ở `rate-limit.middleware.js`, README, CLAUDE.md mục 9 (mục 0.7). |
| QA-28 | Bỏ qua | design.md chưa đặt 44px cho giao diện HR / Admin. |
| QA-30 | Bỏ qua | Chấp nhận (tab PDF không mang tên file gốc vì dùng object URL). |
| QA-34 | Bỏ qua | Theo đề QA2 (A10): đã xem xét, giữ nguyên cách rút gọn "…" ở 375px. |
| QA-16 | Bỏ qua | Vẫn không tái hiện (smoke có reset 268 / 268). |
| QA-29 | Bỏ qua | Đã hết từ QA1 lượt 2. |

### 0.3 Kết quả kiểm (phần B)

| Bộ kiểm | QA1 lượt 2 | QA2 | Ghi chú |
|---|---|---|---|
| `npm run test:smoke` (có reset DB test) | 268 / 268 | **268 / 268** | Sửa kỳ vọng 4 ca: `rawText` → `textLength`, thêm kiểm không có `filePath`. |
| `npm run test:timeout` | 8 / 8 | **8 / 8** | Kiểm `textLength` thay `rawText`. |
| `npm run test:nlp-fail` | 61 / 61 | **61 / 61** | 2 ca "lỗi 500 không xác định" dùng chuỗi quá dài nay thành 400 ở cả development và production (đúng QA-02). |
| `test-qa1-api.js` (script API mở rộng) | 374 / 402 | **402 / 402** | Quyền 268, Biên 58, Luồng 37, Upload 13, Ảnh 20, Mục tiêu 6. Ma trận quyền ghi ADMIN được phép ở 9 route của QA-01. |
| `test-qa2.js` (mới, B1 + B2) | — | **93 / 93** | Chạy 3 lần: lần 1 dừng giữa chừng vì "fetch failed" phía client trước khi request tới server (log server không có request đó); lần 2 và 3 đạt 93 / 93. |
| C1–C2 mọi route × 5 nhóm × 1280 / 900 / 375 | 192, tràn 0, lỗi 0 | **192, tràn 0, console 0, request lỗi 0** | Số "đè / cắt / vùng bấm nhỏ" giống QA1 (báo nhầm, QA-34, QA-15 / 28). |
| C3 luồng bấm thật | 41 / 41 sau chạy lại | **41 / 41 sau chạy lại** | Lần đầu 31 / 41. 8 bước hỏng như QA1 (bộ chọn của script), đã đạt qua `c3-retry.js`, `c3-role.js`. 2 bước hỏng mới ("Xem đối chiếu" của ứng viên, "Đơn ứng tuyển: tất cả tin → một tin" của HR): script chụp lúc trang còn "Đang tải". Đo riêng, cả hai tải xong trong khoảng 420 ms, API trả trong < 30 ms. Chạy lại với chờ đúng lúc đều đạt. |
| C4 điều hướng | 14 / 18 | **18 / 18** | Ca QA-03 (2) và QA-14 (2) đã đạt. |
| C5 bàn phím / nhãn | 41, 0 lỗi thật | **0 lỗi thật** | 4 ca báo nhầm như QA1 (2 ô chọn file ẩn, bộ chọn chuông, nút Xóa CV có tên "Xóa CV <tên file>"); kiểm lại đều đạt. |
| Bộ giao diện QA2 (`c-qa2-ui.js`) | — | **29 / 29** | QA-03 (6), đăng nhập kiểm ngược (9), QA-33 (4), QA-35 (4), C3 chạy lại (3), QA-14, C5 Xóa CV, QA-02 form. |
| Lint frontend (oxlint) | — | **0 cảnh báo** | |
| oxlint backend | — | 19 cảnh báo, đều có từ trước | Không còn QA-18. Cảnh báo `next` trong `errorMiddleware` là bắt buộc (Express nhận middleware lỗi theo 4 tham số). |
| `npm run build` | — | **Đạt** | Chỉ cảnh báo chunk > 500 kB như trước. |
| Tràn ngang 375 / 900 / 1280 phần mới | — | **0 px** | Trang Đơn có `?status=`, hộp ứng tuyển có dòng nhắc CV lỗi. |

**Kiểm ngược (B2)**
- HR B vẫn bị 403 khi sửa / đóng / xóa / phân tích JD / thêm yêu cầu / đổi trạng thái đơn trên tin của HR A. Vẫn xem được đơn của tin HR A (xem chung). Ứng viên không sửa được tin, không đổi được trạng thái đơn. Admin vẫn không tạo được tin (chỉ HR tạo tin).
- Không API nào phía ứng viên, HR, admin trả `filePath` hay `rawText` của CV.
- Script tìm file mồ côi trên DB test:
  - Lúc đầu 0 file mồ côi.
  - Thêm 2 file giả cũ và 1 file giả mới: báo đúng 2 file, bỏ qua file mới.
  - Trả lời "n": không chuyển file nào. Trả lời "y": chuyển đúng 2 file vào `_mo_coi/2026-11-19/`.
  - Liệt kê lại: 0 bản ghi trỏ tới file đã mất, tức không file đang dùng nào bị chuyển.
  - Ép `UPLOAD_DIR=uploads` với DB test: in cảnh báo và từ chối cách ly.
  - Đã dọn các file giả sau khi kiểm.
- Đăng nhập không có trang trước: ứng viên về `/`, HR về `/recruiter/dashboard`, admin về `/admin/dashboard`. "Ứng tuyển ngay" khi chưa đăng nhập vẫn quay lại tin.

**Kết quả mục A2 (production có lộ code không)**: chạy cùng một lỗi Prisma giả qua `errorMiddleware` bản trước QA2 (commit `8f86dcf`) và bản sau QA2:
- **Trước QA2**:
  - **Production KHÔNG lộ**: lỗi 500 không xác định trả "Đã có lỗi xảy ra. Vui lòng thử lại sau.".
  - **Development LỘ** nguyên message Prisma, gồm đường dẫn file và đoạn code (đúng ảnh QA-02 của QA1).
  - test-nlp-fail của QA1 cũng ghi đúng hai điều này.
- **Sau QA2**:
  - Cả hai chế độ đều trả câu chung cho lỗi 500 không xác định.
  - Lỗi 500 tự định nghĩa (câu tiếng Việt) giữ ở development và ẩn ở production, như quyết định 4.3.
  - 400 / 403 / 404 / 429 / 503 giữ message.
  - Chuỗi quá dài không còn thành 500 mà thành 400.
  - Log máy chủ vẫn ghi đủ message gốc và stack.

### 0.4 Hướng dẫn chủ dự án dọn file mồ côi trên DB thật

Chạy trong thư mục `backend`, dùng `.env` thật (AI không chạy bước này):
1. Dừng `npm run dev`. Chép nguyên thư mục `backend/uploads` ra chỗ khác để sao lưu.
2. Liệt kê (không đổi gì): `node --env-file=.env scripts/find-orphan-uploads.js`
   - Kiểm hai dòng đầu: "DB" phải là `cvmatch`, "Thư mục upload" phải là `...\backend\uploads`.
   - Đọc số file mồ côi, tổng dung lượng, 20 file cũ nhất.
   - Lúc kiểm, script đếm được 330 file trong `uploads` (QA1 đếm 316 trước các bước giao diện của QA1); số mồ côi thật do lần chạy này của chủ dự án cho biết.
3. Cách ly: `node --env-file=.env scripts/find-orphan-uploads.js --quarantine`. Script in danh sách rồi hỏi `(y/N)`; gõ `y` để **chuyển** (không xóa) vào `uploads/_mo_coi/<ngày>/`, giữ nguyên thư mục con `avatars/`.
4. Mở web kiểm vài CV / ảnh đại diện vẫn xem được. Cần lấy lại file nào thì chép từ `_mo_coi/<ngày>/` về đúng chỗ cũ, giữ nguyên tên.
5. Chắc chắn không cần nữa thì tự xóa thư mục `_mo_coi/<ngày>/`. Script không bao giờ xóa.

Từ nay smoke / test ghi file vào `backend/uploads-test`. Muốn dọn file của DB test thì chạy cùng script với `--env-file=.env.test`.

### 0.5 Thay đổi khác trong QA2

- **File test (trong `.gitignore`, đã sao lưu `backend/scripts` ra `qa2\backup\scripts-truoc-qa2` và `qa2\backup\scripts-sau-qa2`)**:
  - `smoke-test.js`, `test-timeout.js`, `test-nlp-fail.js`, `test-qa1-api.js`: đổi kỳ vọng theo hành vi mới (mục 0.3).
  - Thêm `test-qa2.js`: `node --env-file=.env.test scripts/test-qa2.js`, cần server test đang chạy.
- **File mới trong repo**: `backend/src/utils/ids.js` (`MAX_DB_ID`, `MAX_PAGE_SIZE`).
- **Rà CLAUDE.md, chỗ còn lệch nhưng không sửa vì là danh sách quyết định / ghi chép lịch sử**:
  - Mục 2 (tech stack) không ghi `cors`, `dotenv`, dù backend đang dùng cả hai từ đầu.
  - Ghi chú T35f / T35g còn nhắc prop `siteStyle`, `enhanced` (T35i đã bỏ, ghi chú T35i có nói).
  - Mục 5 "9 component common" nhưng thư mục `common` có 10 file (thêm `ChangePasswordForm`).
- **DB test sau khi kiểm**:
  - Đã reset một lần bằng smoke, sau đó thêm dữ liệu hậu tố `qa2…`, `qa1…`, `ui…`.
  - Website công ty đã trả lại `https://dtsoftware.example.vn`; admin đăng nhập bằng mật khẩu trong `.env.test` vẫn được.
- **Script và log ngoài repo** (`qa2\` = `C:\Users\Admin\AppData\Local\Temp\claude\91d02647c8b44b6e\83d66db2-b25c-49a7-932e-5935d5cdd688\scratchpad\qa2\`):
  - Log: `b3-smoke.txt`, `b3-timeout.txt`, `b3-nlpfail.txt`, `b3-qa1api.txt`, `b1-qa2.txt`, `b1-qa2-lan3.txt`, `b2-orphan.txt`, `ui\c12.txt`, `ui\c3*.txt`, `ui\c45.txt`, `ui\c-qa2-ui.txt`.
  - Ảnh: `shots\`.

### 0.6 QA3: màn hình quản lý tin cho admin (QA-01, phần giao diện)

- **Cách làm (dùng lại, không thêm endpoint)**:
  - `GET /jobs/my` mở cho ADMIN: trả mọi tin của mọi HR, gồm tin đã đóng. Mỗi tin (cả HR) có thêm `recruiterProfile { id, fullName }`. RECRUITER vẫn chỉ thấy tin của mình.
  - Route `/admin/jobs`, `/admin/jobs/:id/edit`, `/admin/jobs/:id/requirements` trong MainLayout của admin, dùng lại `JobList`, `JobForm`, `ParsedJD`. Ba component đổi đường dẫn gốc theo role. Khi là admin, trang sửa / yêu cầu không gọi API hồ sơ HR và không kiểm người đăng.
  - Chọn route riêng dưới `/admin` thay vì cho admin vào `/recruiter/jobs/...`: cùng số dòng sửa trong component, nhưng Sidebar sáng đúng mục và không phải mở `ProtectedRoute` của khu `/recruiter` cho admin.
  - Trang admin: cột Người đăng, lọc trạng thái `?status=open|closed` (Back bỏ bộ lọc), phân trang 9 dòng như HR. Không có "Tạo tin mới", không có route `jobs/new` (`/admin/jobs/new` ra trang Không tìm thấy).
  - Sidebar admin thêm "Tin tuyển dụng" ngay trên "Tài khoản".
  - Mục 3 của đề (link "Xem tin đã đăng" ở `/admin/users`) **bỏ qua**: danh sách tin chưa có lọc theo người đăng, đề dặn không thêm bộ lọc mới.
- **Kết quả kiểm (DB test, rule)**:
  - Script giao diện + API (`qa3\qa3-admin-jobs.js`): 52 / 53 ở lần chạy đủ. Ca hỏng ("HR mở `/admin/jobs` → /403") do script đọc URL trước khi trang kịp chuyển. Chạy lại riêng 3 lần (`qa3\qa3-hr-block.js`): 3 / 3 về /403.
  - Admin thấy 36 tin của 12 người đăng. Admin sửa tiêu đề, phân tích mô tả công việc, mở trang yêu cầu, đóng, xóa tin của HR khác qua giao diện. HR A vẫn bị chặn ở trang sửa tin của HR B; trang HR không đổi.
  - HR, ứng viên mở 3 route admin → /403; khách → /login. Không tràn ngang ở 1280 / 900 / 375px.
  - Smoke không reset 268 / 268; `test-qa1-api.js` 402 / 402 (ma trận quyền: `GET /jobs/my` cho RECRUITER và ADMIN); `test-qa2.js` 93 / 93. Lint frontend sạch, backend 19 cảnh báo cũ; build đạt.
  - `qa3\` = `C:\Users\Admin\AppData\Local\Temp\claude\91d02647c8b44b6e\83d66db2-b25c-49a7-932e-5935d5cdd688\scratchpad\qa3\` (ảnh trong `shots\`).

### 0.7 QA3 (tiếp): QA-20, QA-24, QA-25, QA-27

- **QA-20 (Đã sửa)**: `ParsedCV.jsx` bỏ `readGuideSeen` / `markGuideSeen` và khóa localStorage `cvmatch.parsedCvGuideSeen`; khung "Cách hệ thống đọc CV của bạn" luôn thu gọn, bấm tiêu đề mới mở. Kiểm (`qa3\qa3-guide.js`) 6 / 6: vào trang 2 lần đều thu gọn, mở rồi tải lại vẫn thu gọn, không ghi localStorage, không lỗi console.
- **QA-24 (Đã sửa)**: quyết định CLAUDE.md 4.4 đúng, code lệch ở bước trích xuất. `extractCvText` không còn ghi `parsedAt` khi đọc file xong và không còn xóa (`null`) khi đọc lỗi. Bước phân tích đã đúng từ trước: ghi trong cùng transaction với dữ liệu hồ sơ, `markParseFailed` không đụng `parsedAt`. Kiểm (`test-qa3.js`, giai đoạn 1–2):
  - Trích xuất xong: `COMPLETED`, `parsedAt` null.
  - Phân tích thành công: `parsedAt` nằm trong khoảng thời gian của lệnh phân tích.
  - Trích xuất lại, đọc file lỗi (`FAILED`), phân tích lỗi (503, hybrid thiếu key, không gọi mạng): `parsedAt` đều giữ nguyên; hồ sơ giữ nguyên số kỹ năng.
  - `npm run test:nlp-fail` 61 / 61, `npm run test:timeout` 8 / 8.
- **QA-25 (Đã sửa)**:
  - a. `registerLimiter`: 30 lần / giờ / IP, tính mọi request → 429 "Bạn đã đăng ký quá nhiều lần. Vui lòng thử lại sau 1 giờ.". Kiểm: 30 lần trùng email đều 400, lần 31 hợp lệ → 429, đăng nhập vẫn chạy. Smoke mỗi lần chạy đăng ký 5 lần (3 tài khoản + 2 ca lỗi) trên server mới, nên mức 30 đủ.
  - b. Đăng nhập email không tồn tại so bcrypt với `DUMMY_PASSWORD_HASH` (cost 10), câu lỗi giữ nguyên. Đo 20 + 20 lần (4 server, mỗi server 10 lần sai để không chạm giới hạn đăng nhập): email có thật sai mật khẩu trung bình **134,1 ms** (trung vị 130,9), email không tồn tại trung bình **133,4 ms** (trung vị 121,8); tỉ lệ 0,99.
- **QA-27 (Hoãn tới khi triển khai)**: không bật `trust proxy`. Chú thích ở đầu `rate-limit.middleware.js`, một dòng ở README (Vận hành → Triển khai sau proxy), CLAUDE.md mục 4.3 và 9.
- **Smoke**: chạy bản không reset (`node --env-file=.env.test scripts/smoke-test.js`) 268 / 268. Bản có reset (`npm run test:smoke`) **chưa chạy**: CLAUDE.md mục 7 ghi lệnh reset DB do chủ dự án tự chạy. Smoke không reset vẫn tự bật server mới nên bộ đếm đăng ký bắt đầu từ 0 như bản có reset.
- `test-qa1-api.js` 402 / 402, `test-qa2.js` 93 / 93 (chạy nối tiếp trên một server, không chạm giới hạn đăng ký). Lint frontend sạch, backend 19 cảnh báo cũ; build đạt.

## 1. Tóm tắt

- **Luồng chính chạy được.** 41 bước bấm thật của khách, ứng viên, nhà tuyển dụng, quản trị viên đều làm được việc:
  - Lần đầu có 10 bước báo hỏng; cả 10 do bộ chọn hoặc thời điểm chờ của script, chạy lại với đúng nhãn / chờ đúng lúc thì đạt.
  - Phần mới của T35k / T35l chạy đúng: ảnh đại diện, mục tiêu nghề nghiệp, xuất CV có chỉnh sửa trước khi in.
- **Giao diện sạch ở mức trang.** 192 lượt mở trang (5 nhóm người dùng × 3 độ rộng):
  - 0 tràn ngang, 0 lỗi JS, 0 cảnh báo React, 0 request 4xx / 5xx ngoài dự kiến.
- **Lỗi lượt 1 gần như còn nguyên**, vì chưa có task sửa:
  - **Chặn** (1): admin không đóng / sửa được tin của nhà tuyển dụng đã nghỉ (QA-01).
  - **Nặng** (4): QA-02 (lỗi 500 lộ code backend), QA-03 (không quay lại trang trước sau đăng nhập), QA-04 ("Ứng viên gợi ý" còn tài khoản khóa / đổi vai trò), QA-05 (thư mục upload dùng chung).
  - QA-05 nặng hơn: **295 file mồ côi**, trong đó 27 ảnh đại diện (lượt 1 là 157).
- **6 lỗi mới**, không có lỗi chặn:
  - **Nhẹ** (2): API CV trả đường dẫn file trên máy chủ (QA-31); tài liệu phân tích chưa có phần mục tiêu nghề nghiệp (QA-32).
  - **Góp ý** (4): QA-33 đến QA-36.
- **Hết / không tái hiện:** QA-29 hết (không còn kỹ năng thiếu `skillId` tra được). QA-16 không tái hiện (smoke có reset đạt 268/268).
- **Dữ liệu thật:**
  - 1 CV ở trạng thái FAILED do Gemini tạm gián đoạn; CV này đang gắn với 1 đơn.
  - CLAUDE.md còn ghi "chưa commit" / "DB thật chưa có migration" cho những việc đã xong (QA-17).

## 2. Bảng lỗi (sắp theo mức độ)

Mức độ:
- **Chặn**: người dùng không hoàn thành được việc.
- **Nặng**: sai nghiệp vụ / bảo mật / dữ liệu, có cách né.
- **Nhẹ**: sai nhỏ, ít gặp.
- **Góp ý**: không sai nhưng nên cải thiện.

| Mã | Mức độ | Trạng thái QA2 | Lượt 2 | Mô tả | Cách tái hiện | File liên quan | Đề xuất sửa |
|---|---|---|---|---|---|---|---|
| QA-01 | Chặn | **Đã sửa** (API ở QA2, màn hình admin `/admin/jobs` ở QA3) | Còn | Admin không đóng / sửa được tin và không đổi được trạng thái đơn của nhà tuyển dụng khác. CLAUDE.md 4.2 ghi "Admin toàn quyền" và "HR nghỉ việc: admin tự sửa/đóng job của họ". `assertCanManageJob` có nhánh ADMIN, nhưng route chặn từ trước nên nhánh này không bao giờ chạy. Giao diện admin cũng không có trang quản lý tin. | `PATCH /api/jobs/:id/close` và `PATCH /api/applications/:id/status` bằng token admin → 403 "Không có quyền thực hiện thao tác này." (B3, nhóm Luồng). | `job/job.route.js` (`recruiterOnly`), `application/application.route.js`, `job/job.service.js` (`assertCanManageJob`) | Cho ADMIN qua các route sửa / đóng / xóa tin, sửa yêu cầu, đổi trạng thái đơn (`authorize('RECRUITER','ADMIN')`; service đã có nhánh ADMIN). Màn hình admin xem tin cần chủ dự án quyết. |
| QA-02 | Nặng | **Đã sửa** | Còn | Backend không kiểm độ dài chuỗi cho các cột `VarChar`. Chuỗi quá dài làm Prisma lỗi → **500**; khi chạy development, message trả về chứa đường dẫn file và đoạn code backend, giao diện in nguyên văn. Trang Đăng ký không có `maxLength` nên người dùng gặp được ngay. | Trang Đăng ký: họ tên 300 ký tự → "Invalid `tx.candidateProfile.create()` invocation in D:\CVMatch-AI\backend\src\modules\auth\auth.service.js:61:31 …". Qua API (B3) cũng 500: đăng ký (họ tên 300, email 201), `PUT /candidates/me` (SĐT 80, tiêu đề 300), kỹ năng / kinh nghiệm / học vấn 300, `POST /jobs` (tiêu đề 300), `POST /admin/recruiters` (SĐT 80), `PUT /companies/me` (địa chỉ 300), tải CV có tên file 364 ký tự. Ảnh: `qa1b\shots\loi\QA-02-dang-ky-ten-dai-500.png`. | `auth.service.js`, `candidate.service.js`, `candidate.items.service.js`, `job.service.js`, `admin.service.js`, `company.service.js`, `cv.service.js` (`createCv`), `error.middleware.js`, `frontend/src/pages/auth/Register.jsx` | Kiểm độ dài ở service (400 + câu tiếng Việt), cắt / báo lỗi tên file > 255. `error.middleware`: đổi lỗi Prisma `P2000` thành 400 và không trả message Prisma thô kể cả ở development. Thêm `maxLength` cho form Đăng ký. |
| QA-03 | Nặng | **Đã sửa** | Còn | Mở URL cần đăng nhập khi chưa đăng nhập thì sau khi đăng nhập về trang mặc định của vai trò, không quay lại trang đã mở. Trái CLAUDE.md 4.3 ("Đăng nhập xong quay lại trang trước"). Luồng "Ứng tuyển ngay" vẫn đúng vì truyền `from` riêng. | Chưa đăng nhập, mở `/candidate/applications` → đăng nhập → về `/`. HR mở `/recruiter/applications?jobId=…&status=REVIEWING` → về `/recruiter/dashboard` (C4). Ảnh: `qa1b\shots\loi\QA-03-url-sau-ung-vien-ve-trang-chu.png`, `qa1b\shots\loi\QA-03-url-sau-hr-ve-tong-quan.png`. | `frontend/src/routes/ProtectedRoute.jsx` (`<Navigate to="/login" replace />` không có `state`), `frontend/src/api/axiosClient.js` | `<Navigate to="/login" replace state={{ from: location.pathname + location.search }} />`. Ở axiosClient, khi gặp 401 thì chuyển `/login` kèm đường dẫn hiện tại. |
| QA-04 | Nặng | **Đã sửa** | Còn | "Ứng viên gợi ý" lấy mọi `CandidateProfile` có CV đã phân tích, gồm cả tài khoản **đã khóa** và tài khoản **đã đổi sang nhà tuyển dụng**. | B3: khóa ứng viên → vẫn có trong `GET /matching/recommended-candidates/:jobId`; đổi ứng viên sang RECRUITER → vẫn hiện như ứng viên. | `ai/recommendation/recommend.service.js` (`recommendCandidatesForJob`) | Lọc `user: { isActive: true, role: { name: 'CANDIDATE' } }`; cân nhắc lọc tương tự ở `GET /candidates/:id` và đối chiếu phía HR. |
| QA-05 | Nặng | **Đã sửa** (thư mục test riêng + script); dọn file DB thật: **Chuyển chủ dự án** | Còn, nặng hơn | `.env.test` (và `.env.test.example`) đặt `UPLOAD_DIR="uploads"`, cùng thư mục với DB thật. Test ghi CV và (từ T35k) ảnh vào thư mục server thật dùng; reset DB test không xóa file. | D5: 316 file (286 CV, 30 ảnh). Thuộc DB thật: 3; thuộc DB test: 18; **mồ côi: 295**, trong đó 27 ảnh. Tổng 164,89 MB (D6). | `backend/.env.test`, `backend/.env.test.example`, `backend/scripts/smoke-test.js` | Đặt `UPLOAD_DIR="uploads-test"` cho DB test; reset DB test thì dọn thư mục đó. Chủ dự án sao lưu rồi dọn file mồ côi (danh sách lấy bằng `qa1b\d-readonly.js`). |
| QA-31 | Nhẹ | **Đã sửa** | Mới | Các API CV của ứng viên trả `filePath` (đường dẫn file trên máy chủ, dạng `uploads/<uuid>.pdf`); `POST /cvs/upload` và `POST /cvs/:id/extract` còn trả cả `rawText` (toàn văn CV). Giao diện không dùng hai trường này. Chỉ chính chủ CV thấy, nhưng lộ cấu trúc thư mục máy chủ và làm phản hồi nặng thêm. | `GET /api/cvs`, `GET /api/cvs/:id`, `POST /api/cvs/upload`, `POST /api/cvs/:id/extract` (B3 nhóm Ảnh, kiểm tay). | `backend/src/modules/cv/cv.service.js` (`listMyCvs` select `filePath`; `createCv`, `extractCvText`, `getCvById` trả cả bản ghi) | Bỏ `filePath` khỏi mọi response; chỉ trả `rawText` ở API thật sự cần (nếu có). Giao diện không cần sửa. |
| QA-06 | Nhẹ | **Đã sửa** | Còn | Tham số `limit` không có trần: `limit=100000` thì server trả `limit=100000`. | B3: `GET /jobs`, `/applications/mine`, `/admin/users`, `/notifications` với `limit=100000`. | `job.service.js`, `application.service.js`, `admin.service.js`, `notification.service.js` | `Math.min(limit, 50)` như `recommend.service.js`. |
| QA-07 | Nhẹ | **Đã sửa** | Còn | Từ khóa tìm tin chứa `%` hoặc `_` thành ký tự đại diện: tìm "%" ra mọi tin. | `GET /api/jobs?keyword=%25` → 6 / 6 tin (B3). | `job.service.js` (`listOpenJobs`) | Escape `%`, `_`, `\` trước khi đưa vào `contains`. |
| QA-08 | Nhẹ | **Đã sửa** | Còn | Mã số vượt INT → 500 thay vì 400 / 404. Lượt 2 thấy thêm ở `GET /cvs/<số rất lớn>/file`. | `GET /api/jobs/9999999999999999999999`, `GET /api/cvs/1111111111111111111111111/file` → 500. | Các hàm `parseId` (job, application, cv, admin, ai…) | Thêm điều kiện `id <= 2147483647`. |
| QA-09 | Nhẹ | **Đã sửa** | Còn | Body JSON hỏng → 400 với câu tiếng Anh "Unexpected end of JSON input"; body > 100 KB → 413 "request entity too large". | B3, nhóm Biên. | `backend/src/app.js` (`express.json()`), `error.middleware.js` | Dịch `entity.parse.failed`, `entity.too.large`; cân nhắc `express.json({ limit: '1mb' })`. |
| QA-10 | Nhẹ | **Đã sửa** | Còn | Đường dẫn API không tồn tại trả trang HTML 404 của Express, không phải JSON. | `GET /api/khong-co-duong-dan-nay` → `text/html`. | `backend/src/app.js` | Middleware 404 dạng JSON trước `errorMiddleware`. |
| QA-11 | Nhẹ | **Đã sửa** | Còn | Website công ty nhận mọi chuỗi, kể cả `javascript:alert(1)`. Footer và trang Giới thiệu chỉ tạo link khi bắt đầu bằng http(s) nên không có XSS, nhưng footer in nguyên chuỗi rác. | `PUT /api/companies/me {"website":"javascript:alert(1)"}` → 200; footer hiện "javascript:alert(1)". Ảnh: `qa1b\shots\loi\QA-11-QA-34-footer-javascript-va-cat-ten-375.png` (dữ liệu thử, đã trả lại `https://…` ở C3). | `company.service.js` (`updateMyCompany`) | Chỉ nhận `http://` hoặc `https://`, sai thì 400. |
| QA-12 | Nhẹ | **Đã sửa** | Còn | Xóa tin chạy hai lệnh rời (xóa yêu cầu rồi xóa tin), không gói transaction. | Đọc code: `deleteJob` gọi `jobRequirement.deleteMany` rồi `job.delete`. | `job.service.js` (`deleteJob`) | Gói trong `prisma.$transaction`, bắt `P2003` trả câu "Tin tuyển dụng đã có đơn…". |
| QA-13 | Nhẹ | **Đã sửa** phần câu lỗi; CV kẹt PROCESSING: **Bỏ qua** | Còn | Trích xuất CV lỗi bất ngờ thì lưu thẳng `err.message` vào `CV.errorMessage` rồi hiện cho ứng viên (bước phân tích đã tránh việc này). CV kẹt `PROCESSING` không bấm "Phân tích lại" được. | Đọc code `extractCvText`. DB thật hiện không có CV kẹt (D3). | `cv.service.js` (`extractCvText`) | Dùng cách của `parseFailureMessage`; cho trích xuất lại khi `PROCESSING` quá N phút. |
| QA-14 | Nhẹ | **Đã sửa** | Còn | Trang Đơn ứng tuyển và Ứng viên gợi ý của HR đổi bộ lọc bằng `replace`, nên Back **rời khỏi trang** (về Tổng quan) thay vì bỏ bộ lọc vừa chọn. F5 vẫn giữ bộ lọc. | C4: chọn tin → chọn trạng thái → Back → `/recruiter/dashboard`; Ứng viên gợi ý: chọn tin → Back → `/recruiter/dashboard`. Ảnh: `qa1b\shots\loi\QA-14-back-don-ung-tuyen-hr.png`, `qa1b\shots\loi\QA-14-back-ung-vien-goi-y.png`. | `frontend/src/pages/recruiter/Applications.jsx` (`setSearchParams(params, { replace: true })`), `RecommendedCandidates.jsx` | Bỏ `{ replace: true }` khi người dùng tự đổi bộ lọc; giữ `replace` khi tự sửa trang vượt quá. |
| QA-15 | Nhẹ | **Bỏ qua** | Còn | Vùng bấm dưới 44px ở 375px trên trang khách / ứng viên (T35f đặt 44px cho SiteLayout): link footer 21–23px, Logo 28px, "Bằng chứng trong CV" 18px, "Cập nhật hồ sơ" 18px, link "Quay lại…" 21px, "Quên mật khẩu?" / "Quay lại đăng nhập" 18px, ô nhập và nút trang Đăng nhập / Đăng ký / Quên / Đặt lại mật khẩu 40px. | C1, trường `small` trong `qa1b\c12-report.json`. Ảnh: `qa1b\shots\loi\QA-15-dang-nhap-o-nhap-40px-375.png`. | `SiteFooter.module.css`, `Logo.module.css`, `ParsedCV.module.css`, `MatchingDetail.module.css`, `Auth.module.css`, `RequirementEvidenceMatrix.module.css` | `min-height: var(--touch-target)` dưới 900px cho các mục trên. |
| QA-17 | Nhẹ | **Đã sửa** | Còn, thêm dòng | Tài liệu lệch thực tế. `docs/cach-phan-tich-va-doi-chieu.md` dòng 287 còn "Lưu ý: hồ sơ của bạn…" (T35j đã bỏ "Lưu ý:"). CLAUDE.md mục 6: T35j, T35k, T35l ghi "(đã xong, chưa commit)" nhưng đã commit (`8f86dcf`); T35k ghi "DB thật CHƯA có migration `20261117090000_add_candidate_avatar_objective`" nhưng `cvmatch` đã chạy (D, 6 / 6 migration, 0 chờ); T35g ghi "DB thật chưa có migration `add_application_cv`" và Task F ghi "DB thật CHƯA chạy seed mới", nhưng `cvmatch` đã có cả hai (133 Skill, 17 tin). | Đọc tài liệu + mục D. | `CLAUDE.md` mục 6, `docs/cach-phan-tich-va-doi-chieu.md` | Sửa các câu cho đúng hiện trạng. |
| QA-18 | Nhẹ | **Đã sửa** | Còn | Biến không dùng `roles` trong `findRoleByName` (một truy vấn thừa). | oxlint backend (A3). | `backend/src/modules/admin/admin.service.js:35` | Xóa dòng truy vấn. |
| QA-32 | Nhẹ | **Đã sửa** | Mới | `docs/cach-phan-tich-va-doi-chieu.md` chưa nói gì về mục tiêu nghề nghiệp. Thiếu: Gemini trả thêm `objective`; rule tìm theo danh sách tiêu đề (T35l); quy tắc chỉ điền khi ô trống (không ghi đè); log lý do khi không điền. Hội đồng đọc tài liệu sẽ không thấy phần này. | Tìm "mục tiêu" / "objective" trong tài liệu: chỉ có một chữ trong danh sách tiêu đề mục (dòng 56). | `docs/cach-phan-tich-va-doi-chieu.md` mục 3, 4.1, 5 | Thêm một mục ngắn, nội dung như CLAUDE.md 4.4. |
| QA-19 | Góp ý | **Bỏ qua** | Còn | Trang "Yêu cầu tuyển dụng" của HR chỉ đổi được Loại và Xóa; muốn sửa tên tiêu chí hay số năm thì phải xóa rồi thêm lại, dù API `PUT /jobs/:id/requirements/:reqId` đã có. | C3: bảng yêu cầu có 0 nút sửa từng dòng. | `frontend/src/pages/recruiter/ParsedJD.jsx` | Nút "Sửa" mở hộp như "Thêm yêu cầu thủ công". |
| QA-20 | Góp ý | **Đã sửa ở QA3** | Còn (code chưa đổi) | Trang Kết quả phân tích CV: khung "Cách hệ thống đọc CV của bạn" mở sẵn lần đầu cộng dòng nhắc "Dữ liệu được đọc tự động…", tức hơn một câu phụ trên một màn hình ứng viên (quy tắc T35j). | Mở `/candidate/cvs/parsed` lần đầu. | `ParsedCV.jsx` | Đóng khung hướng dẫn mặc định, hoặc bỏ dòng nhắc. |
| QA-21 | Góp ý | **Bỏ qua** | Còn | Chi tiết tin ở 375px: khoảng trống khoảng 150px giữa mô tả công việc và "Vị trí khác đang tuyển". | Ảnh: `qa1b\shots\loi\QA-21-khoang-trong-chi-tiet-tin-375.png`. | `JobDetail.module.css` | Chuyển khoảng chừa cho thanh ứng tuyển dính đáy xuống cuối trang. |
| QA-22 | Góp ý | **Bỏ qua** | Còn | Email dài bị bẻ giữa chừng: bảng Tài khoản người dùng (admin), thẻ tóm tắt khu Tài khoản. Đọc vẫn được. | C1 (email thử rất dài). | `AccountList.module.css`, `AccountLayout.module.css` | Chấp nhận, hoặc bẻ sau dấu `@`. |
| QA-23 | Góp ý | **Bỏ qua** | Còn | Gợi ý việc làm / ứng viên gọi matcher cho từng tin / từng ứng viên (2N truy vấn); "Xác nhận tất cả" gọi API tuần tự (có chủ đích, T35j). | Đọc code. | `recommend.service.js`, `matcher.js`, `ParsedCV.jsx` | Ghi vào hướng phát triển. |
| QA-24 | Góp ý | **Đã sửa ở QA3** | Còn | `CV.status = COMPLETED` và `parsedAt` được đặt ngay sau bước **trích xuất chữ**, trước bước phân tích. Gọi API trích xuất mà không phân tích vẫn ứng tuyển được; câu "hồ sơ chưa cập nhật từ CV này" có thể sai. Ở DB thật, CV 29 có `parsedAt` dù phân tích FAILED. | Đọc code `extractCvText`; D3. | `cv.service.js`, `application.service.js` | Ghi rõ trong tài liệu, hoặc chỉ đặt `parsedAt` ở bước phân tích. |
| QA-25 | Góp ý | **Đã sửa ở QA3** | Còn | Đăng ký báo "Email này đã được dùng…" và đăng nhập không so mật khẩu giả khi email không tồn tại, nên dò được email đã đăng ký. `/auth/register` không có rate limit. | Đọc code: `auth.route.js` chỉ có `loginLimiter`, `forgotPasswordLimiter`. | `auth.service.js`, `auth.route.js` | Rate limit cho đăng ký; so bcrypt giả khi email không tồn tại. |
| QA-26 | Góp ý | **Bỏ qua** | Còn | Đổi mật khẩu không vô hiệu token cũ (CLAUDE.md mục 9 đã ghi là hướng phát triển). | B3: token cũ sau đổi mật khẩu → 200. | `auth.middleware.js` | Giữ ở Hướng phát triển. |
| QA-27 | Góp ý | **Hoãn tới khi triển khai** | Còn | Chưa đặt `app.set('trust proxy', …)`: triển khai sau proxy thì rate limit tính theo IP của proxy. | Đọc code `app.js`. | `backend/src/app.js` | Đặt khi triển khai sau proxy. |
| QA-28 | Góp ý | **Bỏ qua** | Còn | HR / Admin ở 375px có nhiều nút 32–40px (nút trong bảng, phân trang, ô chọn, nút Hiện / Ẩn, Đăng xuất). Design chưa đặt 44px cho MainLayout. | C1, `small` của recruiter / admin. | CSS module `pages/recruiter`, `pages/admin`, `components/common/Pagination` | Cân nhắc khi có thời gian. |
| QA-30 | Góp ý | **Bỏ qua** | Còn | PDF mở bằng "Xem CV" là object URL, nên tab mới không mang tên file gốc. DOCX tải về đúng tên gốc (C3: "CV Hoàng Minh Châu.docx"). | Cần xem bằng mắt trên Chrome / Edge thật (headless tải PDF về). | `frontend/src/utils/cvFile.js` | Chấp nhận, hoặc cơ chế xác thực khác bearer để mở trực tiếp. |
| QA-33 | Góp ý | **Đã sửa** | Mới | Trang Đơn ứng tuyển của ứng viên: bộ lọc trạng thái chỉ nằm trong state, không lên URL, nên F5 / Back mất bộ lọc. Các trang HR / admin đều giữ bộ lọc trên URL. | C4: chọn "Đang xem xét" → URL vẫn `/candidate/applications` → F5 về "Tất cả". | `frontend/src/pages/candidate/MyApplications.jsx` | Đưa bộ lọc lên `?status=` như trang HR. |
| QA-34 | Góp ý | **Bỏ qua** | Mới | Ở 375px, chữ bị rút gọn bằng "…": họ tên dài trong thẻ tóm tắt khu Tài khoản ("Nguyễn Thị Á…"), email ở header HR / Admin. Đúng ý đồ "tóm tắt một dòng" nhưng tên tiếng Việt 4 chữ thường bị cắt. | C1 (24 lượt "cắt chữ", đều là hai chỗ này). Ảnh: `qa1b\shots\loi\QA-11-QA-34-footer-javascript-va-cat-ten-375.png`, `qa1b\shots\loi\QA-34-header-hr-cat-email-375.png`. | `AccountLayout.module.css`, `Header.module.css` | Cho tên xuống tối đa 2 dòng, hoặc chỉ hiện tên rút gọn như AccountMenu. |
| QA-35 | Góp ý | **Đã sửa** | Mới | Ứng tuyển được với CV chưa phân tích hoặc phân tích lỗi: `getCvToAttach` chỉ kiểm CV thuộc ứng viên và còn file (đúng mô tả T35g), không kiểm trạng thái. Ở DB thật, đơn đang gắn CV 29 (FAILED). Không sai nghiệp vụ vì đối chiếu dùng hồ sơ, nhưng HR có thể thấy CV mà hệ thống chưa đọc được. | Đọc code; D3. | `application.service.js` (`getCvToAttach`), `components/application/ApplyAction.jsx` | Chủ dự án quyết: chỉ cho chọn CV COMPLETED, hoặc giữ nguyên và hiện nhãn trạng thái rõ trong hộp ứng tuyển. |
| QA-36 | Góp ý | **Đã sửa** | Mới | Tải ảnh đại diện: không có rate limit, và hai lần tải cùng lúc có thể để lại file mồ côi. `setMyAvatar` đọc `avatarPath` cũ trước khi ghi; hai request song song đều xóa cùng file cũ và không xóa file của request kia. | Đọc code (A3). | `candidate.service.js` (`setMyAvatar`), `candidate.route.js` | Rate limit nhẹ cho `POST /me/avatar`; xóa file cũ theo giá trị đọc lại trong cùng transaction. |

**Lỗi của lượt 1 đã hết hoặc không tái hiện**

| Mã | Trạng thái QA2 | Lượt 2 | Ghi chú |
|---|---|---|---|
| QA-16 | **Bỏ qua** (vẫn không tái hiện: smoke QA2 268 / 268) | Không tái hiện | Smoke có reset (B1) đạt 268 / 268, 4 ca rate limit không hỏng. Có thể còn phụ thuộc máy (IPv4 / IPv6), nên giữ đề xuất gọi `127.0.0.1` trong smoke. |
| QA-29 | **Bỏ qua** (đã hết) | Hết | D2: 17 kỹ năng `skillId = null` nhưng 0 kỹ năng tra ra Skill có sẵn (lượt 1: 7). |

## 3. Bảng phủ kiểm

Số "hỏng" là ca hỏng thật, đã trừ ca script báo nhầm (ghi trong cột Ghi chú).

| Mục | Nội dung | Số ca | Đạt | Hỏng | Ghi chú |
|---|---|---|---|---|---|
| A1 | Code so với CLAUDE.md mục 4 | 4 nhóm, khoảng 45 quyết định | — | 2 lệch + tài liệu cũ | Lệch: QA-01, QA-03. Tài liệu cũ: QA-17. Quyết định T35k / T35l khớp code: ảnh ≤ 1 MB theo magic bytes, `?avatar=1`, PUT không trả ảnh, ảnh không trả cho HR / Admin, mục tiêu ≤ 1000 ký tự + không ghi đè + log lý do, danh sách tiêu đề mục tiêu, xuất CV không ghi DB. |
| A2 | Xác thực + quyền từng endpoint, kiểm chủ sở hữu | 67 endpoint × 4 danh tính (B3) | 268 | 0 | Không endpoint nào thiếu xác thực. Hai endpoint ảnh kiểm vai trò trước khi nhận file. Chủ sở hữu kiểm ở CV, đơn, ảnh, kỹ năng / kinh nghiệm / học vấn, thông báo, đối chiếu, tin. Không chỗ nào trả `avatarPath`. |
| A3 | Lỗi lập trình thường gặp | 7 nhóm | 4 | 3 | 0 import vòng (script dò đồ thị require / import), 0 TODO / FIXME, `console.log` chỉ là log có chủ đích, không thiếu `await`. Hỏng: QA-18 (biến thừa), QA-12 (thiếu transaction), QA-23 (truy vấn theo vòng lặp); thêm QA-36. oxlint còn báo `catch (err)` không dùng, escape thừa trong regex, `new Array(n)`: không ảnh hưởng chạy. |
| A4 | Frontend: API trong vòng lặp, cleanup, key, link chết, object URL | 96 link / navigate nội bộ, mọi useEffect gọi API | — | 0 | 96 / 96 link khớp route có thật. Object URL thu hồi sau 60 giây. Code mới T35l: ResizeObserver được `disconnect`. API trong vòng lặp chỉ có "Xác nhận tất cả" (có chủ đích). |
| A5 | Bảo mật: upload, path traversal, rate limit, message lỗi, CORS, helmet, dữ liệu thừa | 7 nhóm | 4 | 3 | Upload CV / ảnh kiểm magic bytes + kích thước, tên UUID, file bị từ chối không ghi đĩa; `resolveCvFilePath` chặn đường dẫn ngoài thư mục; `GET /cvs/..%2F..%2F.env/file` → 400. Hỏng: QA-02 (lộ message Prisma), QA-11 (website `javascript:`), QA-31 (`filePath` / `rawText`). Rate limit thiếu ở đăng ký và tải ảnh (QA-25, QA-36). |
| A6 | `docs/cach-phan-tich-va-doi-chieu.md` so với matcher | Mục 8.1–8.4 | Khớp | 2 | Phần đối chiếu khớp code. Thiếu phần mục tiêu nghề nghiệp (QA-32); 1 câu cũ (QA-17). |
| B1 | `npm run test:smoke` (reset DB test, được phép trong đề bài) | 268 | 268 | 0 | 67 / 67 endpoint được gọi. |
| B2 | `test:timeout`, `test:nlp-fail` | 8 + 61 | 69 | 0 | |
| B3 | `backend/scripts/test-qa1-api.js` (mở rộng ở lượt 2) | 402 | 374 | 28 | Quyền 268 / 268; Biên 36 / 58; Luồng 33 / 37; Upload 12 / 13; Ảnh 19 / 20; Mục tiêu 6 / 6. Mọi ca hỏng thuộc QA-01, 02, 04, 06–11, 31. Lượt 2 thêm: 2 endpoint ảnh vào ma trận quyền; ảnh SVG khai PNG, GIF, WEBP, 2 MB, 1 MB + 1 byte, rỗng, `.exe`, đúng 1 MB, ảnh của người khác; mục tiêu 1001 ký tự, chỉ khoảng trắng, HTML / script / emoji; phân trang `page=0` / âm ở các API khác. |
| C1 | Mọi route × 5 nhóm người dùng × 1280 / 900 / 375 | 192 lượt mở trang | 192 không tràn | — | Tràn ngang: 0. Bẻ chữ: 1 báo nhầm (ngày "(2021-03 - …" xuống dòng ở gạch nối). Chữ đè chữ: 13 lượt, đều báo nhầm (bảng ẩn cho trình đọc màn hình ở Tổng quan, tiêu đề bảng ẩn khi bảng thành thẻ ở 900px, thanh ứng tuyển dính đáy trong ảnh toàn trang; đã xem ảnh). Chữ bị cắt: 24 lượt, đều là QA-34. Vùng bấm nhỏ ở 375px: QA-15, QA-28. |
| C2 | Lỗi console / request trên mọi trang | 192 lượt + các bước C3 | 192 | 0 | 0 lỗi JS, 0 cảnh báo React, 0 request 4xx / 5xx ngoài dự kiến. C3 có 1 lỗi 400 trong console: lần cố tình xóa tài khoản đã có dữ liệu. |
| C3 | Luồng bấm thật 4 vai trò | 41 bước + 3 lần kiểm riêng | 41 | 0 lỗi mới | Lần đầu 31 / 41. 10 bước hỏng do script (chờ khung xương, thẻ tin nằm trang 2, bộ chọn ô mật khẩu, nút "Khóa tài khoản", hộp "Phân tích yêu cầu ngay?", chờ trạng thái "Đã ứng tuyển"…); chạy lại (`c3-retry.js`, `c3-role.js`) đều đạt. Nghi kẹt "Đang tải tin tuyển dụng…" sau đăng nhập: kiểm riêng 3 / 3 lần tải xong trong 0,5 giây, không tái hiện. Ghi nhận: QA-19, QA-30. |
| C4 | Back / Forward, F5, URL sâu, URL của vai trò khác | 18 | 14 | 4 | Hỏng: QA-03 (2 ca), QA-14 (2 ca). URL của vai trò khác → `/403`: 9 / 9; khách → `/login`. F5 giữ trạng thái ở trang chủ, tab Gợi ý, Tài khoản người dùng, Đơn ứng tuyển HR. Ghi nhận QA-33 (bộ lọc của ứng viên không lên URL). |
| C5 | Tab qua form, viền focus, Esc, nhãn | 41 + 3 kiểm lại | 41 | 0 lỗi thật | 7 form: Tab tới đủ mọi ô, ô nào cũng có viền focus. Esc đóng 12 / 12 hộp thoại / menu / panel, focus trả về nút mở. Báo nhầm: 2 ô chọn file ẩn "không có nhãn" (đã có nút mở riêng), chuông thông báo và hộp Xóa CV do bộ chọn (kiểm lại đạt; u1 không có nút Xóa CV vì CV đã gửi kèm đơn, đúng T35g). Menu tài khoản: phím Mũi tên xuống mở và đưa focus vào mục đầu, Enter chỉ mở (có chủ đích). |
| D1 | Tin đang mở đã có yêu cầu gắn Skill | 15 tin, 102 yêu cầu | 15 | 0 | Mọi yêu cầu có `skillId`. Tổng 17 tin (2 đóng). |
| D2 | `CandidateSkill.skillId` null mà tên tra ra Skill | 58 kỹ năng, 17 null | 17 | 0 | QA-29 đã hết. |
| D3 | CV FAILED / PROCESSING treo; đơn `cvId` null | 3 CV, 4 đơn | — | 1 | CV 29 FAILED ("Phân tích bằng AI đang tạm gián đoạn…", hybrid, ngày 17/11), đang gắn với 1 đơn (QA-24, QA-35). 0 PROCESSING treo. 1 đơn `cvId` null (đơn cũ trước T35g, đúng thiết kế). 6 / 6 migration đã chạy. |
| D4 | HR thiếu công ty; user thiếu / thừa hồ sơ theo role | 3 user, 1 công ty | 3 | 0 | 1 admin đang hoạt động, 0 bị khóa, 0 HR thiếu công ty, 0 hồ sơ lệch vai trò. |
| D5 | File trong `uploads/` (CV và `avatars/`) so với bản ghi | 316 file | — | 295 mồ côi | 0 bản ghi mất file, 0 đường dẫn ra ngoài thư mục, 0 `avatarPath` trỏ tới file không tồn tại (DB thật chưa có ảnh). QA-05. |
| D6 | Dung lượng `uploads/` | 316 file | — | — | 164,89 MB; file lớn nhất 3,95 MB (PDF); 41 file > 1 MB. |

## 4. Việc chủ dự án tự làm

1. **Cần Gemini (chế độ hybrid)**:
   - Phân tích lại CV 29 (đang FAILED vì Gemini gián đoạn hôm 17/11, có đơn gắn kèm).
   - Kiểm phần kinh nghiệm / học vấn / mục tiêu do AI đọc: mục tiêu từ Gemini có bị cắt đúng 1000 ký tự không; CV không có tiêu đề mục tiêu thì Gemini có tự suy ra đoạn giới thiệu không.
   - Chạy thử một mô tả công việc có câu rule không phân loại được.
   - Xem lỗi 503 khi hết hạn mức bằng key thật.
2. **Cần gửi mail thật**: `node --env-file=.env.test scripts/test-real-mail.js <email>` (quên mật khẩu → mở link → đặt lại).
3. **Cần xem bằng mắt**:
   - "Xem CV" (PDF) trên Chrome / Edge thật: mở tab, tên tab (QA-30).
   - Hộp in "Xuất CV" thật cả 3 mẫu: khổ A4, bỏ đầu trang / chân trang, nền cột tối khi không tick "Hình nền".
   - Chi tiết tin trên điện thoại thật: khoảng trống (QA-21), thanh ứng tuyển dính đáy không che chữ cuối trang.
   - Thử nhanh bằng NVDA ở Đăng nhập, Kết quả phân tích CV, Chi tiết đối chiếu, hộp Xuất CV.
4. **Dữ liệu thật**:
   - Sao lưu rồi dọn 295 file mồ côi trong `backend/uploads` (cả `avatars/`).
   - Tách thư mục upload cho DB test (QA-05).
5. **Tài liệu**: sửa CLAUDE.md mục 6 theo QA-17; bổ sung phần mục tiêu nghề nghiệp vào tài liệu phân tích (QA-32).
6. **Duyệt danh sách lỗi** ở mục 2 để chọn lỗi sửa trong task sau.

## 5. Ảnh chụp lỗi (ngoài repo)

| Lỗi | Đường dẫn đầy đủ |
|---|---|
| QA-02 | `C:\Users\Admin\AppData\Local\Temp\claude\91d02647c8b44b6e\83d66db2-b25c-49a7-932e-5935d5cdd688\scratchpad\qa1b\shots\loi\QA-02-dang-ky-ten-dai-500.png` | **Đã sửa** |
| QA-03 (ứng viên) | `C:\Users\Admin\AppData\Local\Temp\claude\91d02647c8b44b6e\83d66db2-b25c-49a7-932e-5935d5cdd688\scratchpad\qa1b\shots\loi\QA-03-url-sau-ung-vien-ve-trang-chu.png` |
| QA-03 (HR) | `C:\Users\Admin\AppData\Local\Temp\claude\91d02647c8b44b6e\83d66db2-b25c-49a7-932e-5935d5cdd688\scratchpad\qa1b\shots\loi\QA-03-url-sau-hr-ve-tong-quan.png` |
| QA-11, QA-34 | `C:\Users\Admin\AppData\Local\Temp\claude\91d02647c8b44b6e\83d66db2-b25c-49a7-932e-5935d5cdd688\scratchpad\qa1b\shots\loi\QA-11-QA-34-footer-javascript-va-cat-ten-375.png` |
| QA-14 (Đơn ứng tuyển) | `C:\Users\Admin\AppData\Local\Temp\claude\91d02647c8b44b6e\83d66db2-b25c-49a7-932e-5935d5cdd688\scratchpad\qa1b\shots\loi\QA-14-back-don-ung-tuyen-hr.png` |
| QA-14 (Ứng viên gợi ý) | `C:\Users\Admin\AppData\Local\Temp\claude\91d02647c8b44b6e\83d66db2-b25c-49a7-932e-5935d5cdd688\scratchpad\qa1b\shots\loi\QA-14-back-ung-vien-goi-y.png` |
| QA-15 | `C:\Users\Admin\AppData\Local\Temp\claude\91d02647c8b44b6e\83d66db2-b25c-49a7-932e-5935d5cdd688\scratchpad\qa1b\shots\loi\QA-15-dang-nhap-o-nhap-40px-375.png` | **Bỏ qua** |
| QA-21 | `C:\Users\Admin\AppData\Local\Temp\claude\91d02647c8b44b6e\83d66db2-b25c-49a7-932e-5935d5cdd688\scratchpad\qa1b\shots\loi\QA-21-khoang-trong-chi-tiet-tin-375.png` | **Bỏ qua** |
| QA-34 (header) | `C:\Users\Admin\AppData\Local\Temp\claude\91d02647c8b44b6e\83d66db2-b25c-49a7-932e-5935d5cdd688\scratchpad\qa1b\shots\loi\QA-34-header-hr-cat-email-375.png` |

Ảnh toàn trang của 192 lượt mở trang (C1) nằm trong `qa1b\shots\c1\` (tên file `<nhóm>_<route>-<độ rộng>.png`).

## 6. Phụ lục: dữ liệu và file QA1 lượt 2 đã tạo

- **DB test `cv_matching_test`**:
  - Đã reset một lần qua `npm run test:smoke` (đề bài cho phép).
  - Sau đó thêm tài khoản, tin, đơn có hậu tố `qa1…`, `ui…`, `t35l…` (ứng viên, nhà tuyển dụng, 15 tin, đơn, CV / ảnh tự tạo).
  - Website công ty được B3 đặt thành `javascript:alert(1)`, C3 đã trả lại `https://dtsoftware.example.vn`.
  - Mật khẩu admin và một HR được đổi rồi **đổi lại như cũ**; đăng nhập lại thành công.
- **DB thật `cvmatch`**: chỉ đọc. Script bọc Prisma, chặn mọi thao tác ghi; chỉ in mã số và số đếm.
- **Thư mục `backend/uploads`** (dùng chung, QA-05): các bước test thêm CV / ảnh tự tạo (không phải CV thật).
- **File test**: `backend/scripts/test-qa1-api.js` mở rộng thêm nhóm Ảnh, Mục tiêu, Biên bổ sung (nằm trong `.gitignore`). Đã sao lưu `backend/scripts` ra `qa1b\backup\scripts-truoc-qa1b` và `qa1b\backup\scripts-sau-qa1b`.
- **Script và log ngoài repo** (`qa1b\`):
  - Log: `b1-smoke.txt`, `b2-timeout.txt`, `b2-nlpfail.txt`, `b3-api.txt` / `.json`, `c12.txt`, `c12-report.json`, `c3.txt`, `c3-results.json`, `c3-retry.json`, `c45.txt`, `c45-results.json`, `d-cvmatch.json`.
  - Script: `a-static.js`, `c-setup.js`, `c-lib.js`, `c12-crawl.js`, `c3-flows.js`, `c3-retry.js`, `c3-role.js`, `c3-apply-stuck.js`, `c45.js`, `c5-retry.js`, `d-readonly.js`, `shot-qa02.js`.
- **Không sửa file code nào trong repo.** Ngoài file báo cáo này, git status sạch (file test nằm trong `.gitignore`).
