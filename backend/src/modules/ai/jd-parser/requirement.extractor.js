// Tách yêu cầu từ JD (job description) bằng rule và regex, KHÔNG gọi AI.
// Nguyên tắc: rawText luôn GIỮ NGUYÊN câu gốc trong JD để làm dẫn chứng,
// candidateName chỉ là phần tên yêu cầu đã gọt bỏ cụm dẫn nhập.
// Không đoán, không suy diễn theo ngành, không chấm trọng số.

// ===== JD MẪU ĐỂ TEST (đa ngành) =====
//
// --- JD MẪU 1: Kế toán tổng hợp ---
//   MÔ TẢ CÔNG VIỆC
//   - Lập báo cáo tài chính định kỳ theo quy định
//   YÊU CẦU CÔNG VIỆC
//   - Tốt nghiệp Đại học chuyên ngành Kế toán, Kiểm toán
//   - Yêu cầu tối thiểu 2 năm kinh nghiệm kế toán tổng hợp
//   - Thành thạo Excel, MISA; sử dụng được phần mềm Fast Accounting
//   - Ưu tiên ứng viên có chứng chỉ CPA
//   QUYỀN LỢI
//   - Lương 15-20 triệu, thưởng tháng 13, bảo hiểm đầy đủ
//
//   Mong đợi: 'Kế toán' + 'Kiểm toán' (cùng rawText dòng tốt nghiệp);
//   'kế toán tổng hợp' với minYears = 2; 'Excel' + 'MISA'; 'Fast Accounting'; 'CPA'.
//   Hai dòng tiêu đề thuần bị bỏ, toàn bộ mục dưới "QUYỀN LỢI" bị bỏ.
//
// --- JD MẪU 2: Nhân viên Marketing ---
//   Yêu cầu:
//   • Ít nhất 3 năm kinh nghiệm digital marketing
//   • Thành thạo Facebook Ads, Google Ads và SEO
//   • Biết thêm Photoshop là lợi thế
//   Phúc lợi: du lịch hằng năm, teambuilding
//
//   Mong đợi: 'digital marketing' (minYears = 3); 'Facebook Ads' + 'Google Ads' + 'SEO';
//   'Photoshop'. Dòng "Yêu cầu:" và toàn bộ phần "Phúc lợi" bị bỏ.
//
// --- JD MẪU 3: Backend Developer (JD tiếng Anh) ---
//   Requirements
//   - 2+ years of experience with Java, Spring Boot, MySQL
//   - Proficient in Docker; knowledge of Kubernetes is a plus
//   - Must have good communication skills
//   Benefits
//   - Competitive salary, 13th month bonus
//
//   Mong đợi: 'Java' + 'Spring Boot' + 'MySQL' cùng minYears = 2 và cùng rawText
//   '2+ years of experience with Java, Spring Boot, MySQL'; 'Docker'; 'Kubernetes';
//   'good communication skills'. Phần "Benefits" bị bỏ.

// ===== Tiện ích =====

const COMBINING_MARKS = new RegExp(
  '[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']',
  'g'
);

// Bỏ dấu tiếng Việt, chỉ dùng khi so khớp từ khóa, không đổi text gốc.
// Giữ nguyên độ dài chuỗi để vị trí match vẫn khớp với chuỗi gốc.
function removeDiacritics(text) {
  let result = '';
  for (const ch of String(text || '')) {
    if (ch === 'đ') {
      result += 'd';
      continue;
    }
    if (ch === 'Đ') {
      result += 'D';
      continue;
    }
    const stripped = ch.normalize('NFD').replace(COMBINING_MARKS, '');
    result += stripped.length === ch.length ? stripped : ch;
  }
  return result;
}

function normalizeForMatch(text) {
  return removeDiacritics(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

// ===== Nhận diện tiêu đề section =====

// Tiêu đề mở phần nội dung cần lấy
const CONTENT_HEADINGS = [
  'mo ta cong viec',
  'mo ta chi tiet cong viec',
  'mo ta chi tiet',
  'mo ta',
  'yeu cau cong viec',
  'yeu cau ung vien',
  'yeu cau chung',
  'yeu cau',
  'ky nang',
  'ky nang can co',
  'ky nang yeu cau',
  'trach nhiem',
  'trach nhiem chinh',
  'nhiem vu',
  'nhiem vu chinh',
  'cong viec cu the',
  'job description',
  'job requirements',
  'responsibilities',
  'requirements',
  'requirement',
  'qualifications',
  'skills',
  'required skills',
  'what you will do',
  'your skills',
];

// Tiêu đề mở phần quyền lợi / phúc lợi -> bỏ toàn bộ nội dung bên dưới
const BENEFIT_HEADINGS = [
  'quyen loi',
  'quyen loi duoc huong',
  'phuc loi',
  'che do',
  'che do phuc loi',
  'dai ngo',
  'loi ich',
  'thu nhap',
  'muc luong',
  'luong',
  'luong thuong',
  'thuong',
  'benefits',
  'benefit',
  'what we offer',
  'we offer',
  'perks',
  'perks and benefits',
  'compensation',
  'salary',
];

// Bỏ ký tự bullet / số thứ tự ở ĐẦU dòng (không chạm dấu + trong "2+ years")
function stripBulletPrefix(line) {
  return String(line || '')
    .replace(/^[\s ]*(?:[-–—*•●▪‣o+>]+|\(?\d{1,2}[.)]|[a-zA-Z][.)])[\s ]+/, '')
    .trim();
}

// Cắt nhãn tiêu đề dính liền nội dung: "Yêu cầu: tối thiểu 2 năm" -> "tối thiểu 2 năm".
// Trả kèm loại nhãn để biết đoạn sau có thuộc phần quyền lợi hay không.
function splitHeadingLabel(text) {
  const colonIndex = text.indexOf(':');
  if (colonIndex <= 0 || colonIndex > 40) {
    return { kind: null, rest: text };
  }

  const label = normalizeForMatch(text.slice(0, colonIndex));
  const rest = text.slice(colonIndex + 1).trim();

  if (BENEFIT_HEADINGS.includes(label)) {
    return { kind: 'BENEFIT', rest };
  }
  if (CONTENT_HEADINGS.includes(label)) {
    return { kind: 'CONTENT', rest };
  }

  return { kind: null, rest: text };
}

// Dòng tiêu đề thuần: chỉ có nhãn section, không mang nội dung yêu cầu
function classifyHeadingLine(line) {
  const withoutBullet = stripBulletPrefix(line);
  const body = withoutBullet.replace(/[:：.]+$/, '').trim();

  if (!body) {
    return 'EMPTY';
  }
  // Tiêu đề thuần thì ngắn, không phải một câu dài
  if (body.length > 45 || body.split(/\s+/).length > 6) {
    return null;
  }

  const key = normalizeForMatch(body);

  if (BENEFIT_HEADINGS.includes(key)) {
    return 'BENEFIT';
  }
  if (CONTENT_HEADINGS.includes(key)) {
    return 'CONTENT';
  }

  return null;
}

// ===== Nhận diện số năm kinh nghiệm =====

// "tối thiểu 2 năm", "ít nhất 3 năm", "trên 2 năm", "2+ năm", "2-3 năm",
// "2+ years", "at least 3 years", "minimum of 2 years", "2 năm trở lên"
const YEAR_PATTERNS = [
  /(?:toi\s*thieu|it\s*nhat|tren|tu|khoang|minimum(?:\s*of)?|at\s*least|over|more\s*than)\s*(\d{1,2})\s*(?:-|–|to|den)?\s*\d{0,2}\s*(?:\+)?\s*(?:nam|year)/i,
  /(\d{1,2})\s*(?:\+|plus)\s*(?:nam|year)/i,
  /(\d{1,2})\s*(?:-|–|to|den)\s*\d{1,2}\s*(?:nam|year)/i,
  /(\d{1,2})\s*(?:nam|year)s?\s*(?:tro\s*len|or\s*more|\+)/i,
  /(\d{1,2})\s*(?:nam|year)s?\b/i,
];

// Trả số năm nhỏ nhất tìm được trong câu, không tìm thấy thì null
function extractMinYears(text) {
  const haystack = removeDiacritics(String(text || ''));
  const found = [];

  YEAR_PATTERNS.forEach((pattern) => {
    const match = haystack.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (Number.isInteger(value) && value > 0 && value <= 50) {
        found.push(value);
      }
    }
  });

  return found.length > 0 ? Math.min(...found) : null;
}

// ===== Gọt tên yêu cầu =====

// Cụm dẫn nhập ở đầu, cắt bỏ để lấy tên yêu cầu.
// Xếp cụm dài trước cụm ngắn để cắt được cụm đầy đủ nhất.
const LEADING_PHRASES = [
  'yeu cau ung vien co',
  'yeu cau ung vien',
  'yeu cau co',
  'yeu cau',
  'bat buoc phai co',
  'bat buoc co',
  'bat buoc',
  'phai thanh thao',
  'phai co',
  'phai biet',
  'uu tien ung vien co kinh nghiem',
  'uu tien ung vien co',
  'uu tien ung vien',
  'uu tien co kinh nghiem',
  'uu tien co',
  'uu tien biet',
  'uu tien',
  'ung vien co',
  'co chung chi',
  'chung chi',
  'co bang cap',
  'co bang',
  'biet them ve',
  'biet them',
  'biet su dung',
  'biet',
  'su dung thanh thao',
  'su dung duoc phan mem',
  'su dung duoc',
  'su dung tot',
  'su dung',
  'thanh thao',
  'nam vung',
  'am hieu ve',
  'am hieu',
  'hieu biet ve',
  'hieu biet',
  'kien thuc ve',
  'kien thuc',
  'co kinh nghiem lam viec voi',
  'co kinh nghiem lam viec',
  'co kinh nghiem ve',
  'co kinh nghiem trong linh vuc',
  'co kinh nghiem trong',
  'co kinh nghiem',
  'kinh nghiem lam viec voi',
  'kinh nghiem lam viec',
  'kinh nghiem ve',
  'kinh nghiem trong linh vuc',
  'kinh nghiem trong',
  'kinh nghiem',
  'co kha nang',
  'kha nang',
  'tot nghiep dai hoc chuyen nganh',
  'tot nghiep chuyen nganh',
  'tot nghiep dai hoc',
  'tot nghiep',
  'chuyen nganh',
  'thao tac tot',
  'lam viec voi',
  'phan mem',
  'must have',
  'must be able to',
  'should have',
  'required',
  'require',
  'proficient in',
  'proficiency in',
  'proficient with',
  'strong knowledge of',
  'solid experience in',
  'hands on experience with',
  'years of experience with',
  'years of experience in',
  'years of experience',
  'experience with',
  'experience in',
  'experienced in',
  'knowledge of',
  'familiarity with',
  'familiar with',
  'good command of',
  'ability to',
  'nice to have',
];

// Cụm bổ nghĩa ở cuối, cắt bỏ để lấy tên yêu cầu
const TRAILING_PHRASES = [
  'se la mot loi the',
  'se la loi the',
  'la mot loi the',
  'la loi the',
  'la diem cong',
  'la bat buoc',
  'tro len',
  'is a big plus',
  'is a plus',
  'are a plus',
  'is required',
  'are required',
  'is preferred',
  'are preferred',
  'nice to have',
  'or more',
];

// Cụm chỉ số năm ở đầu câu: "tối thiểu 2 năm kinh nghiệm ..." / "2+ years of experience with ..."
const YEAR_LEADING_REGEX = new RegExp(
  '^(?:toi\\s*thieu|it\\s*nhat|tren|tu|khoang|minimum(?:\\s*of)?|at\\s*least|over|more\\s*than)?' +
    '\\s*\\d{1,2}\\s*(?:-|–|to|den)?\\s*\\d{0,2}\\s*(?:\\+|plus)?\\s*(?:nam|year)s?' +
    '\\s*(?:tro\\s*len|or\\s*more)?' +
    '\\s*(?:kinh\\s*nghiem|of\\s*experience|experience)?' +
    '\\s*(?:lam\\s*viec)?\\s*(?:voi|ve|trong|with|in|of)?\\s*',
  'i'
);

// Cắt phần đầu chuỗi gốc theo độ dài đã khớp trên bản bỏ dấu (độ dài giữ nguyên)
function cutYearPrefix(text) {
  const stripped = removeDiacritics(text);
  const match = stripped.match(YEAR_LEADING_REGEX);
  if (!match || match.index !== 0 || match[0].trim().length === 0) {
    return text;
  }
  return text.slice(match[0].length).trim();
}

function stripLeadingPhrases(text) {
  let result = text;
  let changed = true;

  while (changed && result) {
    changed = false;

    const beforeYear = result;
    result = cutYearPrefix(result);
    if (result !== beforeYear) {
      changed = true;
    }

    const strippedLower = removeDiacritics(result).toLowerCase();
    for (const phrase of LEADING_PHRASES) {
      // Chỉ cắt khi cụm nằm đúng đầu câu và có ranh giới từ ngay sau đó
      if (strippedLower.startsWith(phrase)) {
        const rest = result.slice(phrase.length);
        if (rest === '' || /^[\s:,.\-–—]/.test(rest)) {
          result = rest.replace(/^[\s:,.\-–—]+/, '').trim();
          changed = true;
          break;
        }
      }
    }
  }

  return result;
}

function stripTrailingPhrases(text) {
  let result = text;
  let changed = true;

  while (changed && result) {
    changed = false;
    const strippedLower = removeDiacritics(result).toLowerCase().replace(/[.,;:!]+$/, '');

    for (const phrase of TRAILING_PHRASES) {
      if (strippedLower.endsWith(phrase)) {
        result = result
          .slice(0, strippedLower.length - phrase.length)
          .replace(/[\s,.;:!\-–—]+$/, '')
          .trim();
        changed = true;
        break;
      }
    }
  }

  return result;
}

function cleanCandidateName(text) {
  let name = String(text || '').trim();

  name = stripLeadingPhrases(name);
  name = stripTrailingPhrases(name);
  name = name
    .replace(/^[\s:,.;\-–—(]+/, '')
    .replace(/[\s:,.;\-–—]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return name;
}

// ===== Tách câu gộp nhiều yêu cầu =====

// Tách theo dấu phẩy, gạch chéo, "và", "hoặc", "and", "or";
// KHÔNG tách phần nằm trong ngoặc đơn.
const LIST_SEPARATOR_REGEX = /\s*(?:,|\/|&|\bva\b|\bhoac\b|\band\b|\bor\b)\s*/gi;

// Che nội dung trong ngoặc bằng placeholder để dấu phẩy bên trong không bị tách.
// Placeholder giữ đúng độ dài đoạn gốc để vị trí match không bị lệch.
function maskParentheses(text) {
  const stored = [];
  const masked = text.replace(/\([^()]*\)/g, (group) => {
    stored.push(group);
    return '\u0001'.repeat(group.length);
  });
  return { masked, stored };
}

function splitCombinedNames(text) {
  const { masked, stored } = maskParentheses(text);

  // Tách trên bản bỏ dấu để \bva\b, \bhoac\b khớp được, rồi map vị trí về chuỗi gốc
  const stripped = removeDiacritics(masked);
  const boundaries = [];
  LIST_SEPARATOR_REGEX.lastIndex = 0;

  let match = LIST_SEPARATOR_REGEX.exec(stripped);
  while (match) {
    if (match[0].length > 0) {
      boundaries.push({ start: match.index, end: match.index + match[0].length });
    }
    match = LIST_SEPARATOR_REGEX.exec(stripped);
  }

  const ranges = [];
  let cursor = 0;
  boundaries.forEach((boundary) => {
    ranges.push([cursor, boundary.start]);
    cursor = boundary.end;
  });
  ranges.push([cursor, text.length]);

  // Cắt trên chuỗi GỐC (masked và text cùng độ dài) để giữ nguyên nội dung trong ngoặc
  void stored;
  return ranges
    .map(([start, end]) => text.slice(start, end).trim())
    .filter((part) => part.length > 0);
}

// Tên yêu cầu dùng được: có chữ, không phải một câu văn quá dài
function isUsableName(name) {
  if (!name || name.length < 2) {
    return false;
  }
  if (!/[a-zA-ZÀ-ỹ]/.test(name)) {
    return false;
  }
  if (name.split(/\s+/).length > 12) {
    return false;
  }
  return true;
}

// ===== Hàm chính =====

// extractRequirements(description) -> [{ rawText, candidateName, minYears }]
// rawText giữ NGUYÊN câu gốc; một câu gộp nhiều kỹ năng sinh nhiều phần tử
// có cùng rawText và cùng minYears.
function extractRequirements(description) {
  if (typeof description !== 'string' || !description.trim()) {
    return [];
  }

  const results = [];
  const seen = new Set();
  let inBenefitSection = false;

  description.split(/\r?\n/).forEach((line) => {
    const headingKind = classifyHeadingLine(line);

    if (headingKind === 'BENEFIT') {
      inBenefitSection = true;
      return;
    }
    if (headingKind === 'CONTENT') {
      inBenefitSection = false;
      return;
    }
    // Dòng trống: bỏ, giữ nguyên trạng thái section
    if (headingKind === 'EMPTY') {
      return;
    }

    // Nhãn tiêu đề dính liền nội dung, ví dụ "Phúc lợi: du lịch hằng năm"
    const withoutBullet = stripBulletPrefix(line);
    const labeled = splitHeadingLabel(withoutBullet);
    if (labeled.kind === 'BENEFIT') {
      inBenefitSection = true;
      return;
    }
    if (labeled.kind === 'CONTENT') {
      inBenefitSection = false;
    }

    if (inBenefitSection) {
      return;
    }

    const content = labeled.rest;
    if (!content) {
      return;
    }

    // Trong một dòng vẫn có thể có nhiều yêu cầu cách nhau bởi dấu chấm phẩy
    content.split(/;/).forEach((chunk) => {
      const rawText = stripBulletPrefix(chunk).replace(/[\s;]+$/, '').trim();
      if (!rawText) {
        return;
      }

      const minYears = extractMinYears(rawText);
      const names = [];

      splitCombinedNames(rawText).forEach((part) => {
        const name = cleanCandidateName(part);
        if (isUsableName(name)) {
          names.push(name);
        }
      });

      // Không gọt được tên nào thì dùng cả câu sau khi bỏ cụm dẫn nhập
      if (names.length === 0) {
        const fallback = cleanCandidateName(rawText);
        if (isUsableName(fallback)) {
          names.push(fallback);
        }
      }

      names.forEach((candidateName) => {
        const key = `${rawText}||${candidateName.toLowerCase()}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        results.push({ rawText, candidateName, minYears });
      });
    });
  });

  return results;
}

module.exports = { extractRequirements, extractMinYears };
