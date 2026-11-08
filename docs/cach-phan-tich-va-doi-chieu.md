# Cách hệ thống phân tích CV, phân tích JD và đối chiếu yêu cầu

Tài liệu mô tả đúng theo code hiện tại (T35g) để dùng khi viết khóa luận. Mỗi bước có dẫn `file: hàm`
(đường dẫn tính từ `backend/src/`). Không chứa key, mật khẩu hay dữ liệu thật; hai ví dụ cuối tài liệu dùng CV và JD
tự viết, chạy bằng chính code của hệ thống ở chế độ rule.

Nguyên tắc chung: AI chỉ hỗ trợ bóc tách và đối chiếu, **không quyết định tuyển dụng**. Coverage là chỉ số đối chiếu
yêu cầu, **không phải điểm năng lực**.

## 1. Tổng quan luồng

```
CV:  tải lên -> trích xuất văn bản -> phân tích (rule | hybrid) -> chuẩn hóa -> lưu hồ sơ ứng viên -> ứng viên xác nhận
JD:  HR đăng tin -> tách yêu cầu -> phân loại REQUIRED / PREFERRED / OPTIONAL -> chuẩn hóa -> lưu JobRequirement
Đối chiếu: hồ sơ hiện tại + yêu cầu của tin -> tìm bằng chứng từng yêu cầu -> ma trận -> coverage
```

| Bước | File chính |
|---|---|
| Tải CV lên | `middleware/upload.middleware.js`, `modules/cv/cv.service.js: createCv` |
| Trích xuất văn bản | `modules/ai/text-extraction/*`, `modules/cv/cv.service.js: extractCvText` |
| Phân tích CV | `modules/ai/cv-parser/hybrid.parser.js: parseCV`, `rule.parser.js`, `nlp.parser.js` |
| Lưu hồ sơ | `modules/cv/cv.service.js: parseAndSave` |
| Chuẩn hóa | `modules/ai/normalization/normalizer.js`, `normalization/skill.dictionary.json` |
| Phân tích JD | `modules/job/job.requirement.service.js: parseJobDescription`, `modules/ai/jd-parser/*` |
| Đối chiếu | `modules/ai/matching/matcher.js`, `evidence.finder.js`, `coverage.js` |
| Gợi ý việc làm / ứng viên | `modules/ai/recommendation/recommend.service.js` |

Chế độ NLP đặt bằng biến `NLP_MODE` (`rule` hoặc `hybrid`, mặc định `hybrid`, giá trị khác thì server không khởi động).
`rule` không bao giờ gọi Gemini; `hybrid` dùng rule cộng Gemini.

## 2. Tải CV lên và trích xuất văn bản

- **Tải lên** (`upload.middleware.js`): chỉ nhận `.pdf` / `.docx`, tối đa 5MB, kiểm byte đầu file (PDF bắt đầu `%PDF`,
  DOCX bắt đầu `PK`), tên file lưu là UUID. CV mới có trạng thái `UPLOADED`.
- **Trích xuất** (`cv.service.js: extractCvText`): CV chuyển `PROCESSING`, chọn bộ đọc theo `fileType`
  (`text-extraction/index.js: extractText`):
  - PDF: `pdf.extractor.js: extractFromPdf` dùng `pdf-parse` (`PDFParse.getText`, nối các trang bằng xuống dòng).
  - DOCX: `docx.extractor.js: extractFromDocx` dùng `mammoth.extractRawText`.
  - Làm sạch chung `text-cleaner.js: cleanText`: thống nhất ký tự xuống dòng, bỏ ký tự điều khiển, gộp khoảng trắng
    trong dòng, gộp nhiều dòng trống. `hasUsableText` đòi ít nhất 10 ký tự không phải khoảng trắng; ít hơn thì báo
    "File PDF không chứa văn bản, có thể là bản scan" (hệ thống không OCR).
- Quá `EXTRACT_TIMEOUT_MS` (mặc định 15000 ms) hoặc file hỏng: CV chuyển `FAILED` kèm lý do, file giữ nguyên.
  Thành công: lưu `rawText`, CV chuyển `COMPLETED`, ghi `parsedAt`.

## 3. Phân tích bằng rule (chạy ở cả hai chế độ)

`hybrid.parser.js: parseCV(rawText, { mode, skillIndex })` luôn chạy hai phần rule:

### 3.1 `rule.parser.js: parseByRule`

- `extractContact`: email theo biểu thức chính quy; số điện thoại Việt Nam bắt đầu `+84` hoặc `0` (chuẩn hóa bỏ khoảng
  trắng, dấu chấm); URL theo danh sách tên miền phổ biến.
- `splitSections`: nhận dòng tiêu đề phần đứng riêng (Học vấn / Education, Kinh nghiệm / Work experience, Kỹ năng,
  Dự án, Chứng chỉ, Mục tiêu...; so sau khi bỏ dấu). Dòng có nội dung kèm theo (vd "Kinh nghiệm: 3 năm") không phải
  tiêu đề.
- `extractDateRanges` + `calculateYears`: tìm khoảng thời gian (dd/mm/yyyy, "tháng 3/2020", "T3/2020", "Mar 2020",
  mm/yyyy, yyyy, nối bằng `-`, `–`, "đến", "to"...; "nay", "hiện tại", "present" là đang làm). Tổng số năm gộp các
  khoảng chồng lấn để không đếm trùng, làm tròn 1 chữ số thập phân. Chỉ tính trên phần Kinh nghiệm nếu tách được.

### 3.2 `rule.parser.js: extractSkillsByDictionary` (bóc kỹ năng bằng từ điển)

- Từ điển là **bảng `Skill` trong database** (`name` + `aliases` ngăn cách bằng dấu phẩy, do `prisma/seed.js` tạo),
  nạp một lần bằng `normalizer.js: loadSkillIndex` thành chỉ mục `khóa đã chuẩn hóa -> skillId`.
- Mỗi dòng CV được chuẩn hóa nhưng giữ nguyên độ dài (`normalizeKeepLength`: bỏ dấu, chữ thường) để cắt lại đúng cụm
  gốc. Email, URL trong dòng bị che trước khi so (`blankOutContacts`).
- So **nguyên cụm**, hai đầu không dính chữ hay số; **cụm dài xét trước**, ký tự đã thuộc cụm dài thì cụm ngắn không
  được đè lên ("java script" chỉ ra JavaScript, không thêm Java).
- **Khóa ngắn dưới 3 ký tự** (QA, AI, JS...): chỉ nhận khi CV viết HOA đúng nguyên khóa và đứng riêng một từ
  (`MIN_DICTIONARY_KEY_LENGTH = 3`, cờ `uppercaseOnly`). Vì vậy "Ai cũng..." không ra Illustrator.
- Mỗi `skillId` lấy một lần: `rawName` là cụm đúng như trong CV, `evidence` là dòng đầu tiên chứa cụm,
  `source = 'RULE'`, chưa xác nhận.

Ở chế độ **rule**, `parseCV` không gọi NLP nên `experiences` và `educations` luôn rỗng: kinh nghiệm, học vấn không
được bóc tự động (dữ liệu cũ của hai loại này được giữ nguyên khi lưu, xem mục 5).

## 4. Chế độ hybrid: thêm Gemini

### 4.1 Gọi Gemini (`nlp.parser.js: parseByNlp`)

- **Prompt (ý tưởng)**: `SYSTEM_PROMPT` yêu cầu mô hình chỉ trả JSON thuần; CV có thể thuộc bất kỳ ngành nào, không
  giả định công nghệ thông tin; chỉ lấy thông tin có thật, cấm bịa / suy đoán; không thấy thì trả `null` hoặc mảng
  rỗng; mỗi kỹ năng và kinh nghiệm kèm `evidence` là đoạn **trích nguyên văn** từ CV; ngày theo `YYYY-MM-DD` hoặc
  `YYYY-MM`, đang làm thì `endDate = null`.
- `buildUserPrompt` gửi kèm các phần rule đã tách (để mô hình bám bố cục) và toàn bộ nội dung CV.
- Gọi `generateContent` với `temperature: 0`, ép cấu trúc bằng `RESPONSE_SCHEMA` (structured output; `evidence` bắt
  buộc). Model không nhận schema (400 nhắc "schema") thì gọi lại không kèm schema.
- Kết quả được làm sạch (`normalizeResult`): bỏ kỹ năng không có tên, kinh nghiệm không có vị trí lẫn công ty, học vấn
  không có tên trường.
- **Thử lại** (`llm-retry.js: callWithRetry`): chỉ lỗi tạm thời (mất mạng, quá thời gian 60 giây, HTTP 5xx), tối đa
  2 lần thử lại (chờ 3 giây rồi 8 giây). **Không** thử lại 429 (hết hạn mức), 401 / 403 (sai key), lỗi 4xx khác và
  lỗi nội dung.
- Thiếu `GEMINI_API_KEY` hoặc vẫn lỗi: `parseByNlp` không ném lỗi mà trả kết quả rỗng kèm cờ `failed`.

### 4.2 Gộp kết quả (`hybrid.parser.js: parseCV`)

- **Kỹ năng** (`mergeSkills`): kỹ năng của NLP đứng trước (giữ evidence của NLP), sau đó kỹ năng từ điển. Mỗi kỹ năng
  NLP được chuẩn hóa tên rồi tra `skillId`. Khử trùng (`dedupeSkills`) theo `skillId` nếu tra được, không tra được thì
  theo tên canonical đã chuẩn hóa. Kỹ năng NLP có `source = 'NLP'`.
- **Ngày của kinh nghiệm** (`resolveExperienceDates`): ưu tiên khoảng thời gian rule tìm được ngay trong
  evidence / mô tả; không có mới lấy ngày NLP trả (đọc bằng cùng hàm `parseDateValue`). **Học vấn**
  (`resolveEducationDates`) đọc ngày từ đúng dòng trong phần Học vấn có tên trường.
- Email, số điện thoại chỉ lấy từ rule; họ tên, tiêu đề hồ sơ lấy từ NLP.

### 4.3 Xử lý lỗi (`cv.service.js: parseCvToProfile`, `parseAndSave`)

- Hybrid mà NLP lỗi (`parsed.errors.nlp`): trả **503** "Dịch vụ NLP đang không khả dụng, chưa bóc tách được CV. Dữ liệu
  cũ được giữ nguyên...", kể cả khi từ điển đã bóc được vài kỹ năng (không lưu kết quả nửa vời).
- Mọi lỗi phân tích: `markParseFailed` đặt CV `FAILED`, `errorMessage = "Phân tích thất bại: <lý do>"`, giữ `rawText`.

## 5. Lưu vào hồ sơ (`cv.service.js: parseAndSave`, một transaction)

1. Xóa bản ghi **chưa xác nhận**: hybrid xóa kỹ năng, kinh nghiệm, học vấn chưa xác nhận; rule chỉ xóa kỹ năng chưa
   xác nhận có `source = 'RULE'` (giữ kỹ năng NLP và giữ nguyên kinh nghiệm / học vấn).
2. Rule: bỏ kỹ năng có `skillId` đã có trong hồ sơ (do NLP giữ lại hoặc người dùng đã xác nhận) để không ghi trùng.
3. Ghi bản ghi mới, luôn `isConfirmed = false`. Mục ứng viên đã xác nhận hoặc tự nhập (`MANUAL`) không bị đụng tới.
4. Chỉ điền họ tên, số điện thoại, tiêu đề hồ sơ khi trường đó đang trống.
5. CV `COMPLETED`, cập nhật `parsedAt`. API trả thêm `mode` đã dùng.

## 6. Chuẩn hóa

### 6.1 Tên kỹ năng (`normalization/normalizer.js`)

- `normalizeText`: tách dấu (NFD) rồi bỏ dấu tiếng Việt, `đ -> d`, chữ thường, chỉ giữ chữ, số và `+ # / . & -`,
  gộp khoảng trắng. Dùng chung cho CV, JD và đối chiếu.
- `normalizeSkillName`: tra `skill.dictionary.json` (62 mục `canonical` + `aliases`). Khớp thì trả tên chuẩn
  (vd "MS Excel" -> "Excel"), không khớp thì **giữ nguyên tên gốc**. Không so gần đúng, không đoán theo tiền tố; khóa
  bị hai mục tranh nhau thì bỏ hẳn. Quy tắc cứng: React khác React Native, Java khác JavaScript, Excel khác Excel VBA,
  SQL khác MySQL.
- `resolveSkillId`: tra bảng `Skill` theo tên chuẩn (name + aliases). Không có thì `skillId = null`, **không tự tạo**
  Skill mới.

### 6.2 Ngày tháng (`rule.parser.js: parseDateValue`, `parseDateToken`)

- Nhận "2020-01-15", "2020-01", "2020", "03/2020", "T3/2020", "Tháng 3, 2020", "Mar 2020"...
- Tạo `Date` theo UTC (`toDate`). Chỉ có tháng / năm: ngày bắt đầu lấy đầu tháng / đầu năm, ngày kết thúc lấy ngày
  cuối tháng / cuối năm. "Hiện tại", "nay", "present" hoặc không đọc được -> `null` (với `endDate` nghĩa là đang làm).

## 7. Phân tích JD (`job.requirement.service.js: parseJobDescription`)

### 7.1 Tách yêu cầu (`jd-parser/requirement.extractor.js: extractRequirements`, chỉ rule, không gọi AI)

- Đọc từng dòng JD. Dòng tiêu đề phần nội dung (Mô tả, Yêu cầu, Requirements...) mở lại việc đọc; dòng tiêu đề phần
  quyền lợi (Quyền lợi, Phúc lợi, Benefits...) thì **bỏ toàn bộ phần đó**. Nhãn dính liền nội dung
  ("Phúc lợi: du lịch...") cũng được nhận.
- Một dòng tách tiếp theo dấu `;`. `rawText` **giữ nguyên câu gốc** làm dẫn chứng.
- `extractMinYears`: số năm nhỏ nhất trong câu theo các mẫu "tối thiểu / ít nhất / trên N năm", "N+ năm",
  "N-M năm", "N năm trở lên", "N years"... (1–50).
- `splitCombinedNames` tách câu gộp nhiều kỹ năng theo `,` `/` `&` "và" "hoặc" "and" "or" (không tách trong ngoặc);
  `cleanCandidateName` gọt cụm dẫn nhập / kết thúc (`LEADING_PHRASES`, `TRAILING_PHRASES`: "yêu cầu", "thành thạo",
  "sử dụng tốt", "ưu tiên ứng viên có", "là lợi thế", "is a plus"...);
  `isUsableName` loại tên dưới 2 ký tự, không có chữ cái hoặc dài hơn 12 từ.

### 7.2 Phân loại (`jd-parser/requirement.classifier.js: classifyBatch`)

- **Rule trước** (`classifyByRule`, so sau khi bỏ dấu): có từ khóa bắt buộc ("yêu cầu", "bắt buộc", "phải có",
  "tối thiểu", "thành thạo", "must have", "required") -> `REQUIRED`; có từ khóa ưu tiên ("ưu tiên", "là lợi thế",
  "biết thêm", "nice to have", "plus") -> `PREFERRED`. Có cả hai thì nhóm xuất hiện sớm hơn thắng; trùng vị trí thì
  `PREFERRED` (không nâng lên bắt buộc).
- Rule không quyết được:
  - `NLP_MODE=rule`: để `PREFERRED`, đếm vào `unresolvedCount` (giao diện nhắc HR kiểm tra lại).
  - `hybrid`: gộp mọi câu chưa quyết vào **một** lần gọi Gemini, bắt trả đúng một trong 3 giá trị; giá trị lạ cho một
    mục -> `OPTIONAL`. Thiếu key hoặc Gemini lỗi -> **503**, yêu cầu cũ của tin giữ nguyên.
- Chuẩn hóa tên yêu cầu bằng `normalizeSkillName` + `resolveSkillId` (`normalizeName`), rồi trong một transaction
  **xóa toàn bộ yêu cầu cũ và ghi bộ mới**. API trả `{ requirements, mode, unresolvedCount }`.

## 8. Đối chiếu yêu cầu với hồ sơ

Tính trực tiếp mỗi lần gọi (`matching/matcher.js: matchJobWithCandidate`), không lưu bảng ma trận. Với mỗi yêu cầu:

### 8.1 Tìm bằng chứng (`evidence.finder.js: findEvidence`)

Chạy lần lượt kỹ năng -> kinh nghiệm -> học vấn, giữ kết quả mức cao nhất (EXACT > PARTIAL > NONE), gặp EXACT thì dừng;
bằng mức thì giữ nguồn chạy trước. So khớp **theo từ nguyên vẹn** (`tokenize` trên bản đã chuẩn hóa), không so chuỗi con
ký tự; chỗ tìm thấy nằm gọn trong một mục từ điển dài hơn khác tên chuẩn thì bỏ ("React" không khớp trong
"React Native", "Excel" không khớp trong "Excel VBA").

| Nguồn | EXACT | PARTIAL | NONE |
|---|---|---|---|
| Kỹ năng (`matchOneSkill`) | cùng `skillId`; hoặc trùng tên sau chuẩn hóa (bỏ dấu, không phân biệt hoa thường) | cùng một mục từ điển nhưng gọi bằng tên khác (alias); hoặc tên khớp một phần theo từ, xét cả hai chiều | hai `skillId` khác nhau; hai tên thuộc hai mục từ điển khác nhau; không khớp |
| Kinh nghiệm (`findExperienceEvidence`) | (không có) | tên yêu cầu (hoặc alias) xuất hiện trong vị trí, tên công ty, mô tả hay evidence: **luôn PARTIAL** vì chỉ suy ra từ mô tả | không thấy |
| Học vấn (`findEducationEvidence`) | trường / ngành / bằng **trùng nguyên văn** sau chuẩn hóa | có chứa tên yêu cầu | không thấy |

### 8.2 Yêu cầu có số năm (`matcher.js: resolveEvidence`, `evidence.finder.js: checkYearsRequirement`)

Khi yêu cầu có `minYears`, bằng chứng kỹ năng / học vấn **không đủ** để ra EXACT:

- Lấy các kinh nghiệm liên quan (khớp tên yêu cầu ở vị trí, công ty, mô tả, evidence), cộng thời gian bằng
  `calculateYears` (gộp chồng lấn, `endDate = null` tính tới hôm nay).
- Đủ số năm -> EXACT; có kinh nghiệm liên quan nhưng thiếu năm (hoặc không có ngày) -> PARTIAL.
- Không có kinh nghiệm liên quan nhưng có bằng chứng kỹ năng / học vấn -> PARTIAL. Không có gì -> NONE.

### 8.3 Trạng thái và coverage

- Ánh xạ (chỉ 3 giá trị enum `MatchStatus`): EXACT -> `SUPPORTED` (Có bằng chứng), PARTIAL -> `UNCERTAIN`
  (Chưa chắc chắn), NONE -> `NOT_FOUND` (Không tìm thấy).
- `coverage.js: calculateCoverage`:

  ```
  coverage = số yêu cầu SUPPORTED / tổng số yêu cầu của tin × 100, làm tròn 1 chữ số thập phân
  ```

  Tính trên **toàn bộ** yêu cầu của tin, **không trọng số**: REQUIRED, PREFERRED, OPTIONAL như nhau; UNCERTAIN không
  được tính là có bằng chứng. Tin chưa có yêu cầu: `total = 0`, `coverage = 0` (không chia cho 0) và kèm câu
  "Tin tuyển dụng chưa có yêu cầu để đối chiếu.". Mọi kết quả kèm `COVERAGE_NOTE`: coverage chỉ hỗ trợ đối chiếu, không phải điểm năng
  lực, không phải quyết định tuyển dụng.
- Lúc nộp đơn (`application.service.js: applyForJob`), coverage được tính một lần và lưu vào `Application.coverage`
  (tin chưa có yêu cầu thì lưu `null`). Xem đơn sau đó (`getApplicationDetail`) thì ma trận được **tính lại** theo hồ sơ
  hiện tại, kèm `coverageAtApply` là giá trị đã lưu.
- Gợi ý (`recommend.service.js`): việc làm đang mở đã có yêu cầu, xếp coverage giảm dần (mặc định 10, tối đa 50 tin);
  hồ sơ chưa có dữ liệu phân tích thì trả danh sách rỗng kèm thông báo.

## 9. File CV gửi kèm đơn và hồ sơ dùng để đối chiếu (T35g)

- Mỗi đơn lưu **riêng** CV ứng viên chọn lúc nộp (`Application.cvId`, khóa ngoại `onDelete: Restrict`). Đơn mới bắt
  buộc gửi `cvId`; CV phải thuộc chính ứng viên và còn file (`application.service.js: getCvToAttach`). Nhà tuyển dụng
  xem đúng file đó (`GET /api/cvs/:id/file`). CV đã gửi kèm đơn thì không xóa được.
- **Đối chiếu không đọc file CV của đơn.** Ma trận và coverage dùng **hồ sơ hiện tại** của ứng viên (bảng
  CandidateSkill, CandidateExperience, CandidateEducation), tức kết quả của lần phân tích CV gần nhất cộng các chỉnh
  sửa, xác nhận của ứng viên. Vì vậy ứng viên có thể gửi kèm CV A trong khi hồ sơ được phân tích từ CV B; hộp ứng
  tuyển nói rõ điều này ("Lưu ý: hồ sơ của bạn chưa được cập nhật từ CV này.").
- Đơn nộp trước T35g có `cvId = null`: giao diện hiện CV hiện tại của ứng viên kèm ghi chú "Đang hiển thị CV hiện tại của bạn".

## 10. Hai ví dụ chạy tay

Cả hai dùng CV và JD tự viết, chạy bằng đúng các hàm `parseCV` (chế độ rule), `extractRequirements`,
`classifyBatch` (rule), `normalizeSkillName` / `resolveSkillId`, `findEvidence` / `checkYearsRequirement` và
`calculateCoverage`; bảng Skill đọc từ database test. Không gọi Gemini, không ghi database.

**CV mẫu** (tự viết):

```
NGUYỄN THỊ MẪU
Kế toán tổng hợp
Email: mau.nguyen@example.com | 0901 234 567
KỸ NĂNG
Thành thạo MS Excel, MISA; lập Báo cáo tài chính
KINH NGHIỆM LÀM VIỆC
Kế toán viên – Công ty TNHH Mẫu (03/2021 – nay)
HỌC VẤN
Đại học Kinh tế – chuyên ngành Kế toán (2016 – 2020)
```

**JD mẫu** (tự viết):

```
Mô tả công việc
- Lập báo cáo thuế hằng tháng
Yêu cầu ứng viên
- Tối thiểu 2 năm kinh nghiệm kế toán tổng hợp
- Thành thạo Excel, MISA
- Có kiến thức về thuế
Ưu tiên
- Ưu tiên ứng viên có chứng chỉ CPA
Quyền lợi
- Thưởng tháng 13
```

### Ví dụ 1: phân tích ở chế độ rule

Kết quả bóc CV:

| Cụm trong CV (`rawName`) | Tên chuẩn | `skillId` | Nguồn |
|---|---|---|---|
| Kế toán tổng hợp | Kế toán tổng hợp | có | RULE |
| lập Báo cáo tài chính | Báo cáo tài chính | có | RULE |
| MS Excel | Excel | có | RULE |
| MISA | MISA | có | RULE |

Email và số điện thoại (`0901234567`) bóc được; rule tính được tổng 5,7 năm từ khoảng "03/2021 – nay" nhưng **không lưu
kinh nghiệm, học vấn** (chế độ rule chỉ bóc kỹ năng). Hồ sơ sau khi lưu chỉ có 4 kỹ năng trên.

Kết quả tách JD: 6 yêu cầu (phần "Quyền lợi" bị bỏ), `unresolvedCount = 2`.

| Câu gốc | Tên yêu cầu | Loại | Số năm | Trạng thái |
|---|---|---|---|---|
| Lập báo cáo thuế hằng tháng | Lập báo cáo thuế hằng tháng | PREFERRED (rule không quyết được) | | NOT_FOUND |
| Tối thiểu 2 năm kinh nghiệm kế toán tổng hợp | Kế toán tổng hợp | REQUIRED ("tối thiểu") | 2 | UNCERTAIN |
| Thành thạo Excel, MISA | Excel | REQUIRED ("thành thạo") | | SUPPORTED |
| Thành thạo Excel, MISA | MISA | REQUIRED | | SUPPORTED |
| Có kiến thức về thuế | Có kiến thức về thuế | PREFERRED (rule không quyết được) | | NOT_FOUND |
| Ưu tiên ứng viên có chứng chỉ CPA | CPA | PREFERRED ("ưu tiên") | | NOT_FOUND |

- "Excel": yêu cầu và kỹ năng "MS Excel" cùng `skillId` -> EXACT -> SUPPORTED.
- "Kế toán tổng hợp": kỹ năng khớp nhưng yêu cầu có `minYears = 2` mà hồ sơ không có kinh nghiệm -> PARTIAL ->
  UNCERTAIN (mục 8.2).
- Coverage = 2/6 = **33,3%** (1 chưa chắc chắn, 3 không tìm thấy).

Hai dòng không phân loại được cũng cho thấy giới hạn của bộ tách JD bằng rule: dòng mô tả công việc
("Lập báo cáo thuế hằng tháng") vẫn bị coi là yêu cầu, và tên không được gọt về "Thuế".

### Ví dụ 2: hồ sơ có kinh nghiệm (dữ liệu như chế độ hybrid bóc được, hoặc ứng viên tự nhập)

Cùng JD, hồ sơ thêm một kinh nghiệm nhập tay (không gọi Gemini): vị trí "Kế toán tổng hợp", Công ty TNHH Mẫu,
từ 03/2021, đang làm; học vấn Đại học Kinh tế, ngành Kế toán.

- Kinh nghiệm liên quan "Kế toán tổng hợp" kéo dài hơn 2 năm -> `checkYearsRequirement` trả EXACT -> SUPPORTED.
  Coverage = 3/6 = **50%**.
- Đổi ngày bắt đầu thành 01/2025 (chưa đủ 2 năm) -> PARTIAL -> UNCERTAIN, coverage quay về **33,3%**.

Ví dụ này cho thấy: coverage chỉ đếm yêu cầu có bằng chứng rõ ràng trong hồ sơ; cùng một CV nhưng khác chế độ phân
tích (rule không lưu kinh nghiệm) sẽ ra coverage khác, vì vậy coverage không được dùng như điểm năng lực.

## 11. Giới hạn đã biết (để nêu trong khóa luận)

- Không OCR: PDF bản scan không trích được chữ.
- Kỹ năng bằng rule chỉ nhận cụm có trong bảng Skill; kỹ năng ngoài từ điển chỉ có ở chế độ hybrid.
- Chế độ rule không bóc kinh nghiệm, học vấn nên yêu cầu có số năm thường chỉ ra UNCERTAIN.
- Bộ tách JD dựa trên tiêu đề phần và từ khóa: câu mô tả công việc cũng có thể thành yêu cầu, câu không có từ khóa
  thì không phân loại được bằng rule (chế độ rule để PREFERRED, HR nên kiểm tra lại).
- Đối chiếu dùng hồ sơ hiện tại, không dùng file CV gửi kèm đơn (mục 9).
