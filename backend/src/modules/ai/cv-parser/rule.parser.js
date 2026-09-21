// Parser rule-based cho CV: chỉ dùng regex và luật, không gọi AI, không dùng thư viện NLP.
// Nguyên tắc: không tìm thấy thì trả null hoặc mảng rỗng, tuyệt đối không đoán.

// ===== Tiện ích dùng chung =====

// Dải dấu thanh tổ hợp U+0300..U+036F, tạo bằng fromCharCode cho dễ đọc
const COMBINING_MARKS = new RegExp('[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']', 'g');

// Bỏ dấu tiếng Việt để so khớp tiêu đề (chỉ dùng khi so khớp, không đổi text gốc)
function removeDiacritics(text) {
  return text
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Bỏ dấu nhưng giữ nguyên độ dài chuỗi, để vị trí match vẫn khớp với text gốc
function removeDiacriticsKeepLength(text) {
  let result = '';
  for (const ch of text) {
    if (ch === 'đ') {
      result += 'd';
      continue;
    }
    if (ch === 'Đ') {
      result += 'D';
      continue;
    }
    const stripped = ch.normalize('NFD').replace(COMBINING_MARKS, '');
    // Chỉ thay khi độ dài không đổi, tránh lệch vị trí match
    result += stripped.length === ch.length ? stripped : ch;
  }
  return result;
}

// ===== Hàm 1: extractContact =====
// Test case:
//   Input:
//     "NGUYEN VAN A
//      Email: nguyen.van.a@gmail.com | DT: 0912 345 678
//      linkedin.com/in/nguyenvana - https://github.com/nguyenvana"
//   Output:
//     { email: 'nguyen.van.a@gmail.com',
//       phone: '0912345678',
//       urls: ['linkedin.com/in/nguyenvana', 'https://github.com/nguyenvana'] }
//
//   Input: "Lien he: +84.912.345.678"      -> phone: '+84912345678'
//   Input: "Kinh nghiem 01/2022 - 03/2024" -> { email: null, phone: null, urls: [] }

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Chỉ nhận đúng 2 dạng đề bài yêu cầu: 0xxxxxxxxx và +84xxxxxxxxx
const PHONE_REGEX = /(\+84|0)[\s.\-]?(?:\d[\s.\-]?){8,10}\d/g;

const URL_TLDS = 'com|net|org|vn|io|dev|me|info|edu|co|xyz|site|online';
const URL_REGEX = new RegExp(
  '(?:https?:\\/\\/|www\\.)[^\\s<>"\']+' +
    '|(?:[a-z0-9-]+\\.)+(?:' +
    URL_TLDS +
    ')(?:\\.[a-z]{2})?\\/[^\\s<>"\']*',
  'gi'
);

function normalizePhone(rawPhone) {
  const hasCountryCode = rawPhone.trim().startsWith('+84');
  const digits = rawPhone.replace(/\D/g, '');

  if (hasCountryCode) {
    // +84 + 9 hoặc 10 chữ số
    const national = digits.slice(2);
    if (national.length < 9 || national.length > 10) {
      return null;
    }
    return `+84${national}`;
  }

  // 0 + 9 hoặc 10 chữ số
  if (digits.length < 10 || digits.length > 11 || !digits.startsWith('0')) {
    return null;
  }
  return digits;
}

function extractContact(rawText) {
  const result = { email: null, phone: null, urls: [] };

  if (typeof rawText !== 'string' || !rawText.trim()) {
    return result;
  }

  const emailMatch = rawText.match(EMAIL_REGEX);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // Bỏ email ra khỏi text trước khi dò số điện thoại và URL để tránh nhận nhầm
  const textWithoutEmail = rawText.replace(new RegExp(EMAIL_REGEX.source, 'g'), ' ');

  const phoneMatches = textWithoutEmail.match(PHONE_REGEX) || [];
  for (const candidate of phoneMatches) {
    const normalized = normalizePhone(candidate);
    if (normalized) {
      result.phone = normalized;
      break;
    }
  }

  const urlMatches = textWithoutEmail.match(URL_REGEX) || [];
  const seen = new Set();
  for (const url of urlMatches) {
    // Bỏ dấu câu dính ở cuối
    const cleaned = url.replace(/[.,;:)\]]+$/, '');
    const key = cleaned.toLowerCase();
    if (cleaned && !seen.has(key)) {
      seen.add(key);
      result.urls.push(cleaned);
    }
  }

  return result;
}

// ===== Hàm 2: extractDateRanges =====
// Test case:
//   Input: "Cong ty ABC | 01/2022 - 03/2024"
//     -> [{ raw: '01/2022 - 03/2024', start: 2022-01-01, end: 2024-03-31, isCurrent: false }]
//   Input: "Dai hoc XYZ 2020 - 2023"
//     -> [{ raw: '2020 - 2023', start: 2020-01-01, end: 2023-12-31, isCurrent: false }]
//   Input: "Tháng 5/2021 đến nay"
//     -> [{ raw: 'Tháng 5/2021 đến nay', start: 2021-05-01, end: null, isCurrent: true }]
//   Input: "May 2021 - Present"
//     -> [{ raw: 'May 2021 - Present', start: 2021-05-01, end: null, isCurrent: true }]
//   Input: "15/06/2020 – 20/08/2022"
//     -> [{ raw: '15/06/2020 – 20/08/2022', start: 2020-06-15, end: 2022-08-20, isCurrent: false }]
//   Input: "Ngay ra truong: khong ro" -> []  (không parse được thì bỏ qua, không throw)

const MONTH_NAMES = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const P_FULL_DATE = '\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{4}';
const P_VN_MONTH = '(?:thang|t)\\s?\\d{1,2}\\s?[\\/\\-. ]\\s?\\d{4}';
const P_EN_MONTH = '(?:' + Object.keys(MONTH_NAMES).join('|') + ')\\.?\\s+\\d{4}';
const P_MONTH_YEAR = '\\d{1,2}[\\/\\-.]\\d{4}';
const P_YEAR = '\\d{4}';

// Thứ tự quan trọng: dạng dài khớp trước dạng ngắn
const P_DATE = [P_FULL_DATE, P_VN_MONTH, P_EN_MONTH, P_MONTH_YEAR, P_YEAR].join('|');
const P_CURRENT = '(?:den nay|hien tai|hien nay|nay|present|current|now|today|ongoing)';
const P_SEPARATOR = '\\s*(?:[-–—~]{1,2}|den|to|toi|until)\\s*';

const DATE_RANGE_REGEX = new RegExp(
  '(' + P_DATE + ')' + P_SEPARATOR + '(' + P_DATE + '|' + P_CURRENT + ')',
  'gi'
);

const MONTH_LAST_DAY = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function lastDayOfMonth(year, month) {
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeap ? 29 : 28;
  }
  return MONTH_LAST_DAY[month - 1];
}

function isValidYear(year) {
  return Number.isInteger(year) && year >= 1950 && year <= 2100;
}

// Chuyển một token ngày về { year, month, day } hoặc null nếu không hợp lệ
function parseDateToken(token, isEnd) {
  const normalized = removeDiacritics(String(token)).trim().toLowerCase();

  // 15/06/2020
  let match = normalized.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (!isValidYear(year) || month < 1 || month > 12 || day < 1 || day > lastDayOfMonth(year, month)) {
      return null;
    }
    return { year, month, day };
  }

  // thang 5/2021, t5/2021, thang 5 2021
  match = normalized.match(/^(?:thang|t)\s?(\d{1,2})\s?[\/\-. ]\s?(\d{4})$/);
  if (match) {
    const month = Number(match[1]);
    const year = Number(match[2]);
    if (!isValidYear(year) || month < 1 || month > 12) {
      return null;
    }
    return { year, month, day: isEnd ? lastDayOfMonth(year, month) : 1 };
  }

  // May 2021
  match = normalized.match(/^([a-z]+)\.?\s+(\d{4})$/);
  if (match) {
    const month = MONTH_NAMES[match[1]];
    const year = Number(match[2]);
    if (!month || !isValidYear(year)) {
      return null;
    }
    return { year, month, day: isEnd ? lastDayOfMonth(year, month) : 1 };
  }

  // 01/2022
  match = normalized.match(/^(\d{1,2})[\/\-.](\d{4})$/);
  if (match) {
    const month = Number(match[1]);
    const year = Number(match[2]);
    if (!isValidYear(year) || month < 1 || month > 12) {
      return null;
    }
    return { year, month, day: isEnd ? lastDayOfMonth(year, month) : 1 };
  }

  // 2020
  match = normalized.match(/^(\d{4})$/);
  if (match) {
    const year = Number(match[1]);
    if (!isValidYear(year)) {
      return null;
    }
    return { year, month: isEnd ? 12 : 1, day: isEnd ? 31 : 1 };
  }

  return null;
}

function isCurrentToken(token) {
  const normalized = removeDiacritics(String(token)).trim().toLowerCase();
  return new RegExp('^' + P_CURRENT + '$', 'i').test(normalized);
}

function toDate({ year, month, day }) {
  return new Date(Date.UTC(year, month - 1, day));
}

function extractDateRanges(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return [];
  }

  const normalizedForMatch = removeDiacriticsKeepLength(rawText);
  const ranges = [];
  let match;

  DATE_RANGE_REGEX.lastIndex = 0;
  while ((match = DATE_RANGE_REGEX.exec(normalizedForMatch)) !== null) {
    const raw = rawText.slice(match.index, match.index + match[0].length);
    const start = parseDateToken(match[1], false);

    if (!start) {
      continue; // không parse được thì bỏ qua mục đó
    }

    if (isCurrentToken(match[2])) {
      ranges.push({ raw, start: toDate(start), end: null, isCurrent: true });
      continue;
    }

    const end = parseDateToken(match[2], true);
    if (!end) {
      continue;
    }

    const startDate = toDate(start);
    const endDate = toDate(end);
    if (endDate < startDate) {
      continue; // khoảng thời gian vô lý thì bỏ qua
    }

    ranges.push({ raw, start: startDate, end: endDate, isCurrent: false });
  }

  return ranges;
}

// ===== Hàm 3: calculateYears =====
// Test case:
//   Input: [01/2020 - 12/2021, 01/2021 - 12/2022]  (chồng lấn 1 năm)
//     -> 3 (không phải 4)
//   Input: [2020 - 2021, 2023 - 2024] -> 4
//   Input: [] -> 0

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function calculateYears(ranges) {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return 0;
  }

  const now = Date.now();

  const intervals = ranges
    .map((range) => {
      if (!range || !range.start) {
        return null;
      }
      const start = range.start instanceof Date ? range.start.getTime() : new Date(range.start).getTime();
      const endValue = range.isCurrent || !range.end ? now : range.end;
      const end = endValue instanceof Date ? endValue.getTime() : new Date(endValue).getTime();

      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        return null;
      }
      return [start, end];
    })
    .filter(Boolean)
    .sort((a, b) => a[0] - b[0]);

  if (intervals.length === 0) {
    return 0;
  }

  // Gộp các khoảng chồng lấn để không đếm trùng
  const merged = [intervals[0].slice()];
  for (let i = 1; i < intervals.length; i += 1) {
    const last = merged[merged.length - 1];
    const [start, end] = intervals[i];
    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  const totalMs = merged.reduce((sum, [start, end]) => sum + (end - start), 0);
  return Math.round((totalMs / MS_PER_YEAR) * 10) / 10;
}

// ===== Hàm 4: splitSections =====
// Test case:
//   Input:
//     "MUC TIEU NGHE NGHIEP
//      Tro thanh chuyen vien marketing
//
//      KINH NGHIEM LAM VIEC
//      Cong ty ABC - Nhan vien marketing (2020 - 2023)
//
//      HOC VAN
//      Dai hoc Kinh te
//
//      KY NANG
//      SEO, Google Ads"
//   Output:
//     { objective: 'Tro thanh chuyen vien marketing',
//       experience: 'Cong ty ABC - Nhan vien marketing (2020 - 2023)',
//       education: 'Dai hoc Kinh te',
//       skills: 'SEO, Google Ads',
//       projects: null, certifications: null, other: null }
//
//   Input: "Nguyen Van A\n0912345678"  -> tất cả section null, other giữ nguyên 2 dòng
//   Lưu ý: dòng "Kinh nghiem: 3 nam" KHÔNG được coi là tiêu đề (có nội dung kèm theo).

const SECTION_PATTERNS = {
  education: /^(hoc van|trinh do hoc van|trinh do|qua trinh hoc tap|education|educations|academic background|academic)$/,
  experience: /^(kinh nghiem|kinh nghiem lam viec|kinh nghiem chuyen mon|qua trinh lam viec|qua trinh cong tac|experience|experiences|work experience|working experience|work history|employment history|employment)$/,
  skills: /^(ky nang|ky nang chuyen mon|ky nang ca nhan|chuyen mon|skills|skill|technical skills|soft skills|core skills)$/,
  projects: /^(du an|cac du an|du an tieu bieu|projects|project|personal projects)$/,
  certifications: /^(chung chi|chung nhan|bang cap va chung chi|certifications|certification|certificates|certificate|licenses)$/,
  objective: /^(muc tieu|muc tieu nghe nghiep|gioi thieu ban than|tom tat|objective|career objective|summary|professional summary|profile|about me)$/,
};

const SECTION_KEYS = ['education', 'experience', 'skills', 'projects', 'certifications', 'objective'];

// Một dòng được coi là tiêu đề khi: ngắn, đứng riêng và khớp đúng từ khóa
function detectSectionKey(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) {
    return null;
  }

  const normalized = removeDiacritics(trimmed)
    .toLowerCase()
    .replace(/^[\d\s.)•*+\-–—|]+/, '')
    .replace(/[\s:：.•*+\-–—|]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return null;
  }

  for (const key of SECTION_KEYS) {
    if (SECTION_PATTERNS[key].test(normalized)) {
      return key;
    }
  }

  return null;
}

function splitSections(rawText) {
  const sections = {
    education: null,
    experience: null,
    skills: null,
    projects: null,
    certifications: null,
    objective: null,
    other: null,
  };

  if (typeof rawText !== 'string' || !rawText.trim()) {
    return sections;
  }

  const lines = rawText.split('\n');
  const buckets = {
    education: [],
    experience: [],
    skills: [],
    projects: [],
    certifications: [],
    objective: [],
    other: [],
  };

  // Phần đầu CV (tên, liên hệ) chưa thuộc tiêu đề nào -> other
  let currentKey = 'other';

  for (const line of lines) {
    const key = detectSectionKey(line);
    if (key) {
      currentKey = key;
      continue; // bỏ chính dòng tiêu đề ra khỏi nội dung
    }
    buckets[currentKey].push(line);
  }

  for (const key of Object.keys(buckets)) {
    const content = buckets[key].join('\n').replace(/\n{3,}/g, '\n\n').trim();
    sections[key] = content || null;
  }

  return sections;
}

// ===== Hàm tổng: parseByRule =====
// Test case:
//   Input: rawText của CV marketing 2 trang
//   Output: { email, phone, urls, dateRanges, totalYears, sections }
//   Input: '' -> { email: null, phone: null, urls: [], dateRanges: [], totalYears: 0, sections: {...null} }

function parseByRule(rawText) {
  const contact = extractContact(rawText);
  const sections = splitSections(rawText);

  // Chỉ tính số năm kinh nghiệm từ phần kinh nghiệm nếu nhận diện được,
  // không có thì lấy toàn bộ CV (không suy đoán thêm)
  const experienceText = sections.experience || rawText;
  const dateRanges = extractDateRanges(experienceText);
  const totalYears = calculateYears(dateRanges);

  return {
    email: contact.email,
    phone: contact.phone,
    urls: contact.urls,
    dateRanges,
    totalYears,
    sections,
  };
}

module.exports = {
  extractContact,
  extractDateRanges,
  calculateYears,
  splitSections,
  parseByRule,
};
