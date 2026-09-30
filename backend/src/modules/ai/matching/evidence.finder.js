// Tìm bằng chứng trong hồ sơ ứng viên cho MỘT yêu cầu của JD.
// Chỉ đối chiếu và trích dẫn, KHÔNG chấm điểm năng lực, KHÔNG quyết định tuyển dụng.
//
// matchType:
//   EXACT   : bằng chứng khớp trực tiếp với yêu cầu
//   PARTIAL : khớp một phần, khớp qua alias, hoặc suy ra từ mô tả
//   NONE    : không tìm thấy
//
// QUY TẮC BẮT BUỘC: CẤM coi hai kỹ năng khác nhau là khớp.
// React khác React Native, Java khác JavaScript, Excel khác Excel VBA, SQL khác MySQL.
// Cách chặn:
//   1. So khớp theo TỪ nguyên vẹn, không so chuỗi con ký tự
//      -> "java" không bao giờ khớp bên trong "javascript".
//   2. Hai tên đều có trong từ điển nhưng khác canonical -> coi là hai kỹ năng khác nhau.
//      Hai skillId khác nhau cũng vậy.
//   3. Tên cần tìm là một mục trong từ điển mà chỗ tìm thấy lại nằm TRONG một mục từ điển
//      dài hơn, khác canonical -> bỏ chỗ đó.
//      -> "React" không khớp trong "làm app bằng React Native",
//         "Excel" không khớp trong "viết macro Excel VBA".
//
// requirement     : { normalizedName, skillId, minYears, rawText }  (JobRequirement)
// candidateSkills : [{ skillId, rawName, evidence }]                (CandidateSkill)
// experiences     : [{ position, companyName, startDate, endDate, description, evidence }]
// educations      : [{ school, major, degree }]

const dictionary = require('../normalization/skill.dictionary.json');
const { normalizeText, normalizeSkillName } = require('../normalization/normalizer');
const { calculateYears } = require('../cv-parser/rule.parser');

const MATCH_RANK = { NONE: 0, PARTIAL: 1, EXACT: 2 };

const SOURCE_SKILL = 'CandidateSkill';
const SOURCE_EXPERIENCE = 'CandidateExperience';
const SOURCE_EDUCATION = 'CandidateEducation';

function noEvidence() {
  return { evidenceText: null, source: null, matchType: 'NONE' };
}

// ===== Tách từ =====

// Tách thành danh sách từ trên bản đã chuẩn hóa (bỏ dấu, lowercase).
// Giữ nguyên + # . - bên trong từ để C#, C++, Node.js, react-native không bị vỡ.
function tokenize(text) {
  return normalizeText(text)
    .replace(/[\/&]/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^[.\-]+|[.\-]+$/g, ''))
    .filter(Boolean);
}

// Mọi vị trí [start, end) mà dãy từ needle xuất hiện nguyên vẹn trong haystack
function findOccurrences(haystack, needle) {
  const found = [];
  if (needle.length === 0 || needle.length > haystack.length) {
    return found;
  }

  for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    let same = true;
    for (let k = 0; k < needle.length; k += 1) {
      if (haystack[i + k] !== needle[k]) {
        same = false;
        break;
      }
    }
    if (same) {
      found.push([i, i + needle.length]);
    }
  }

  return found;
}

// ===== Từ điển =====

// Mọi tên trong từ điển (canonical + aliases) ở dạng dãy từ, kèm canonical của nó
const DICTIONARY_TERMS = [];
const ALIASES_BY_CANONICAL = new Map();

for (const entry of dictionary) {
  const names = [entry.canonical, ...(entry.aliases || [])];
  ALIASES_BY_CANONICAL.set(entry.canonical, names);

  for (const name of names) {
    const tokens = tokenize(name);
    if (tokens.length > 0) {
      DICTIONARY_TERMS.push({ tokens, canonical: entry.canonical });
    }
  }
}

// Canonical trong từ điển, không có trong từ điển thì null
function dictionaryCanonical(name) {
  const { canonical, matched } = normalizeSkillName(name);
  return matched ? canonical : null;
}

// Các đoạn trong text trùng một mục từ điển, dùng để chặn khớp lồng (quy tắc 3)
function findDictionarySpans(tokens) {
  const spans = [];
  for (const term of DICTIONARY_TERMS) {
    for (const [start, end] of findOccurrences(tokens, term.tokens)) {
      spans.push({ start, end, canonical: term.canonical });
    }
  }
  return spans;
}

// Chỗ tìm thấy nằm gọn trong một mục từ điển DÀI HƠN, khác canonical -> không tính
function isInsideOtherSkill(occurrence, targetCanonical, spans) {
  if (!targetCanonical) {
    return false;
  }
  const [start, end] = occurrence;
  return spans.some(
    (span) =>
      span.start <= start &&
      end <= span.end &&
      span.end - span.start > end - start &&
      span.canonical !== targetCanonical
  );
}

// Các cách gọi của yêu cầu: tên đã lưu, cộng canonical và aliases nếu có trong từ điển
function buildSearchTerms(name) {
  const canonical = dictionaryCanonical(name);
  const names = canonical ? [name, ...ALIASES_BY_CANONICAL.get(canonical)] : [name];

  const seen = new Set();
  const terms = [];
  for (const item of names) {
    const tokens = tokenize(item);
    const key = tokens.join(' ');
    // Bỏ tên quá ngắn (1 ký tự) để tránh khớp bừa
    if (tokens.length === 0 || key.length < 2 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    terms.push(tokens);
  }

  return { canonical, terms };
}

// Text có chứa một trong các cách gọi của yêu cầu (theo từ, đã chặn khớp lồng) hay không
function textContainsTerms(text, search) {
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return false;
  }

  const spans = findDictionarySpans(tokens);
  return search.terms.some((term) =>
    findOccurrences(tokens, term).some(
      (occurrence) => !isInsideOtherSkill(occurrence, search.canonical, spans)
    )
  );
}

function isSameText(a, b) {
  const left = normalizeText(a);
  return left.length > 0 && left === normalizeText(b);
}

// Trích NGUYÊN VĂN câu/dòng chứa bằng chứng, không tách được thì trả cả trường
function pickSnippet(text, search) {
  const original = String(text || '').trim();
  const segments = original
    .split(/\r?\n|(?<=[.;!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const hit = segments.find((segment) => textContainsTerms(segment, search));
  return hit || original;
}

function requirementName(requirement) {
  return requirement && typeof requirement.normalizedName === 'string'
    ? requirement.normalizedName.trim()
    : '';
}

function hasId(value) {
  return Number.isInteger(value) && value > 0;
}

// ===== Hàm 1: findSkillEvidence =====
// Test case (requirement.normalizedName  vs  CandidateSkill.rawName):
//   skillId trùng nhau                    -> EXACT
//   'Excel'          vs 'excel'           -> EXACT   (trùng sau chuẩn hóa)
//   'Excel'          vs 'MS Excel'        -> PARTIAL (khớp qua alias)
//   'Fast Accounting' vs 'Phần mềm Fast Accounting' -> PARTIAL (khớp một phần)
//   'React'          vs 'React Native'    -> NONE
//   'Java'           vs 'JavaScript'      -> NONE
//   'Excel'          vs 'Excel VBA'       -> NONE

function matchOneSkill(requirement, candidateSkill) {
  const reqName = requirementName(requirement);
  const rawName = typeof candidateSkill.rawName === 'string' ? candidateSkill.rawName.trim() : '';

  // EXACT: trùng skillId
  if (hasId(requirement.skillId) && hasId(candidateSkill.skillId)) {
    if (requirement.skillId === candidateSkill.skillId) {
      return 'EXACT';
    }
    // Hai skillId khác nhau là hai kỹ năng khác nhau, không xét khớp một phần
    return 'NONE';
  }

  if (!reqName || !rawName) {
    return 'NONE';
  }

  // EXACT: trùng tên sau chuẩn hóa, không phân biệt hoa thường
  if (isSameText(reqName, rawName)) {
    return 'EXACT';
  }

  const reqCanonical = dictionaryCanonical(reqName);
  const candCanonical = dictionaryCanonical(rawName);

  if (reqCanonical && candCanonical) {
    // PARTIAL: cùng một mục từ điển nhưng gọi bằng alias khác nhau
    // Khác mục từ điển: hai kỹ năng khác nhau, dừng luôn
    return reqCanonical === candCanonical ? 'PARTIAL' : 'NONE';
  }

  // PARTIAL: khớp một phần theo từ, xét cả hai chiều
  const reqSearch = buildSearchTerms(reqName);
  if (textContainsTerms(rawName, reqSearch)) {
    return 'PARTIAL';
  }
  const candSearch = buildSearchTerms(rawName);
  if (textContainsTerms(reqName, candSearch)) {
    return 'PARTIAL';
  }

  return 'NONE';
}

function findSkillEvidence(requirement, candidateSkills) {
  if (!requirement || !Array.isArray(candidateSkills)) {
    return noEvidence();
  }

  let best = null;
  for (const candidateSkill of candidateSkills) {
    if (!candidateSkill) {
      continue;
    }

    const matchType = matchOneSkill(requirement, candidateSkill);
    if (matchType === 'NONE') {
      continue;
    }

    if (!best || MATCH_RANK[matchType] > MATCH_RANK[best.matchType]) {
      const evidence =
        typeof candidateSkill.evidence === 'string' ? candidateSkill.evidence.trim() : '';
      best = {
        evidenceText: evidence || candidateSkill.rawName,
        source: SOURCE_SKILL,
        matchType,
      };
      if (matchType === 'EXACT') {
        break;
      }
    }
  }

  return best || noEvidence();
}

// ===== Hàm 2: findExperienceEvidence =====
// Test case:
//   'Kế toán tổng hợp' vs position 'Kế toán tổng hợp'                    -> PARTIAL
//   'Excel' vs description 'Lập báo cáo bằng MS Excel hằng tháng'         -> PARTIAL
//   'React' vs description 'Phát triển ứng dụng bằng React Native'        -> NONE
// Luôn là PARTIAL vì chỉ suy ra từ mô tả, ứng viên không khai báo trực tiếp.

const EXPERIENCE_FIELDS = ['position', 'companyName', 'description', 'evidence'];

function experienceMatches(experience, search) {
  return EXPERIENCE_FIELDS.some((field) => textContainsTerms(experience[field], search));
}

function findExperienceEvidence(requirement, experiences) {
  const reqName = requirementName(requirement);
  if (!reqName || !Array.isArray(experiences)) {
    return noEvidence();
  }

  const search = buildSearchTerms(reqName);

  for (const experience of experiences) {
    if (!experience) {
      continue;
    }
    for (const field of EXPERIENCE_FIELDS) {
      if (textContainsTerms(experience[field], search)) {
        return {
          evidenceText: pickSnippet(experience[field], search),
          source: SOURCE_EXPERIENCE,
          matchType: 'PARTIAL',
        };
      }
    }
  }

  return noEvidence();
}

// ===== Hàm 3: findEducationEvidence =====
// Test case:
//   'Kế toán'  vs major 'Kế toán'                    -> EXACT   (trùng nguyên trường)
//   'Kế toán'  vs major 'Kế toán - Kiểm toán'        -> PARTIAL (khớp một phần)
//   'Marketing' vs major 'Quản trị kinh doanh'       -> NONE

const EDUCATION_FIELDS = ['school', 'major', 'degree'];

function findEducationEvidence(requirement, educations) {
  const reqName = requirementName(requirement);
  if (!reqName || !Array.isArray(educations)) {
    return noEvidence();
  }

  const search = buildSearchTerms(reqName);
  let best = null;

  for (const education of educations) {
    if (!education) {
      continue;
    }
    for (const field of EDUCATION_FIELDS) {
      const value = typeof education[field] === 'string' ? education[field].trim() : '';
      if (!value) {
        continue;
      }

      if (isSameText(reqName, value)) {
        return { evidenceText: value, source: SOURCE_EDUCATION, matchType: 'EXACT' };
      }
      if (!best && textContainsTerms(value, search)) {
        best = { evidenceText: value, source: SOURCE_EDUCATION, matchType: 'PARTIAL' };
      }
    }
  }

  return best || noEvidence();
}

// ===== Hàm 4: checkYearsRequirement =====
// Test case (minYears = 2):
//   experience liên quan 01/2020 - 12/2022        -> EXACT   (totalYears 3)
//   experience liên quan 01/2023 - 06/2023        -> PARTIAL (totalYears 0.5)
//   experience liên quan nhưng không có ngày      -> PARTIAL (totalYears 0)
//   không có experience liên quan                 -> NONE
//   requirement không có minYears                 -> null (không áp dụng)
// endDate = null được hiểu là đang làm (theo quy ước lúc bóc tách CV).

function toDateOrNull(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function describeExperience(experience) {
  const title = [experience.position, experience.companyName]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' - ');
  const start = toDateOrNull(experience.startDate);
  const end = toDateOrNull(experience.endDate);
  const format = (date) => date.toISOString().slice(0, 7);

  if (!start) {
    return `${title} (không rõ thời gian)`;
  }
  return `${title} (${format(start)} - ${end ? format(end) : 'hiện tại'})`;
}

function checkYearsRequirement(requirement, experiences) {
  if (!requirement || requirement.minYears === null || requirement.minYears === undefined) {
    return null;
  }

  const minYears = Number(requirement.minYears);
  const reqName = requirementName(requirement);
  if (!Number.isFinite(minYears) || !reqName) {
    return null;
  }

  const search = buildSearchTerms(reqName);
  const related = (Array.isArray(experiences) ? experiences : []).filter(
    (experience) => experience && experienceMatches(experience, search)
  );

  if (related.length === 0) {
    return { ...noEvidence(), totalYears: 0, minYears };
  }

  const ranges = related
    .map((experience) => {
      const start = toDateOrNull(experience.startDate);
      if (!start) {
        return null;
      }
      const end = toDateOrNull(experience.endDate);
      return { start, end, isCurrent: !end };
    })
    .filter(Boolean);

  const totalYears = calculateYears(ranges);

  return {
    evidenceText: related.map(describeExperience).join('; '),
    source: SOURCE_EXPERIENCE,
    matchType: totalYears >= minYears ? 'EXACT' : 'PARTIAL',
    totalYears,
    minYears,
  };
}

// ===== Hàm tổng: findEvidence =====
// Chạy lần lượt skill -> experience -> education, trả kết quả tốt nhất.
// Bằng mức thì giữ nguồn chạy trước. Gặp EXACT thì dừng.

function findEvidence(requirement, candidateProfile) {
  const profile = candidateProfile || {};
  const finders = [
    () => findSkillEvidence(requirement, profile.skills),
    () => findExperienceEvidence(requirement, profile.experiences),
    () => findEducationEvidence(requirement, profile.educations),
  ];

  let best = noEvidence();
  for (const finder of finders) {
    const result = finder();
    if (MATCH_RANK[result.matchType] > MATCH_RANK[best.matchType]) {
      best = result;
    }
    if (best.matchType === 'EXACT') {
      break;
    }
  }

  return best;
}

module.exports = {
  findSkillEvidence,
  findExperienceEvidence,
  findEducationEvidence,
  checkYearsRequirement,
  findEvidence,
};
