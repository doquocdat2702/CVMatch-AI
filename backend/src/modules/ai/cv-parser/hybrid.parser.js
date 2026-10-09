// Gộp kết quả của rule-based parser và NLP parser.
// Một parser lỗi thì vẫn dùng được kết quả của parser còn lại.
// Chế độ rule: chỉ chạy rule (kể cả bóc kỹ năng bằng từ điển), KHÔNG gọi NLP.
// Chế độ hybrid: chạy cả hai, kỹ năng của NLP và của từ điển gộp lại, mỗi kỹ năng một lần.
const { parseByRule, extractDateRanges, extractSkillsByDictionary } = require('./rule.parser');
const { parseByNlp } = require('./nlp.parser');
const { normalizeText, normalizeSkillName, resolveSkillId, loadSkillIndex } = require('../normalization/normalizer');

const SOURCE_RULE = 'RULE';
const SOURCE_NLP = 'NLP';

// Chuyển chuỗi ngày của NLP ("2020-01-15" | "2020-01" | "2020") về Date, sai thì null
function toDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }

  match = text.match(/^(\d{4})-(\d{1,2})$/);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  }

  match = text.match(/^(\d{4})$/);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), 0, 1));
  }

  return null;
}

function emptyRuleResult() {
  return {
    email: null,
    phone: null,
    urls: [],
    dateRanges: [],
    totalYears: 0,
    sections: {
      education: null,
      experience: null,
      skills: null,
      projects: null,
      certifications: null,
      objective: null,
      other: null,
    },
  };
}

function emptyNlpResult() {
  return { fullName: null, headline: null, skills: [], experiences: [], educations: [] };
}

// Khử trùng lặp skill, giữ bản ghi đầu tiên. Mặc định so theo tên đã lowercase + trim;
// truyền keyOf để so theo khóa khác (ví dụ theo skillId).
function dedupeSkills(skills, keyOf = (skill) => skill.rawName.toLowerCase()) {
  const seen = new Set();
  const result = [];

  for (const skill of skills) {
    const rawName = typeof skill.rawName === 'string' ? skill.rawName.trim() : '';
    if (!rawName) {
      continue;
    }

    const key = keyOf({ ...skill, rawName });
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({
      rawName,
      skillId: skill.skillId === undefined ? null : skill.skillId,
      evidence: skill.evidence || null,
      source: skill.source || SOURCE_NLP,
    });
  }

  return result;
}

// Gộp kỹ năng NLP (đứng trước, giữ evidence của NLP) với kỹ năng bóc bằng từ điển.
// Cùng một kỹ năng thì chỉ giữ một: so theo skillId nếu tra được bảng Skill,
// không tra được thì so theo tên đã chuẩn hóa (T14).
async function mergeSkills(nlpSkills, ruleSkills, skillIndex) {
  const withIds = [];
  for (const skill of nlpSkills) {
    const rawName = typeof skill.rawName === 'string' ? skill.rawName.trim() : '';
    const { canonical } = normalizeSkillName(rawName);
    const skillId = rawName ? await resolveSkillId(canonical, skillIndex) : null;
    withIds.push({ ...skill, rawName, skillId, source: SOURCE_NLP });
  }

  return dedupeSkills([...withIds, ...ruleSkills], (skill) =>
    skill.skillId !== null && skill.skillId !== undefined
      ? `id:${skill.skillId}`
      : `name:${normalizeText(normalizeSkillName(skill.rawName).canonical)}`
  );
}

// Ngày tháng ưu tiên rule: nếu tìm được mốc thời gian ngay trong evidence/description
// thì dùng của rule, không có mới lấy ngày do NLP suy ra.
function resolveExperienceDates(experience) {
  const evidenceText = [experience.evidence, experience.description]
    .filter((text) => typeof text === 'string' && text.trim())
    .join('\n');

  let ruleRange = null;
  if (evidenceText) {
    try {
      const ranges = extractDateRanges(evidenceText);
      ruleRange = ranges.length > 0 ? ranges[0] : null;
    } catch (err) {
      ruleRange = null;
    }
  }

  if (ruleRange) {
    return {
      startDate: ruleRange.start,
      endDate: ruleRange.isCurrent ? null : ruleRange.end,
      dateSource: SOURCE_RULE,
    };
  }

  return {
    startDate: toDate(experience.startDate),
    endDate: toDate(experience.endDate),
    dateSource: SOURCE_NLP,
  };
}

// Tìm dòng trong phần học vấn có chứa tên trường, để rule đọc mốc thời gian từ đúng dòng đó
function findLineContaining(sectionText, needle) {
  if (typeof sectionText !== 'string' || typeof needle !== 'string' || !needle.trim()) {
    return null;
  }

  const target = needle.trim().toLowerCase();
  const line = sectionText.split('\n').find((item) => item.toLowerCase().includes(target));
  return line || null;
}

// Ngày tháng của học vấn cũng ưu tiên rule, đọc từ dòng gốc trong CV
function resolveEducationDates(education, educationSection) {
  const line = findLineContaining(educationSection, education.school);

  if (line) {
    try {
      const ranges = extractDateRanges(line);
      if (ranges.length > 0) {
        const range = ranges[0];
        return {
          startDate: range.start,
          endDate: range.isCurrent ? null : range.end,
          dateSource: SOURCE_RULE,
        };
      }
    } catch (err) {
      // rule lỗi thì rơi xuống dùng ngày của NLP
    }
  }

  return {
    startDate: toDate(education.startDate),
    endDate: toDate(education.endDate),
    dateSource: SOURCE_NLP,
  };
}

// mode: 'rule' | 'hybrid'. skillIndex: chỉ mục bảng Skill (loadSkillIndex), không truyền thì tự nạp.
async function parseCV(rawText, { mode = 'hybrid', skillIndex } = {}) {
  const errors = { rule: null, nlp: null };
  const index = skillIndex || (await loadSkillIndex());

  // Chạy rule-based
  let ruleResult = emptyRuleResult();
  try {
    ruleResult = parseByRule(rawText);
  } catch (err) {
    errors.rule = err.message;
    console.error(`[HYBRID] Rule parser lỗi: ${err.message}`);
  }

  // Bóc kỹ năng bằng từ điển bảng Skill: chạy ở cả hai chế độ
  let ruleSkills = [];
  try {
    ruleSkills = extractSkillsByDictionary(rawText, index);
  } catch (err) {
    errors.rule = errors.rule || err.message;
    console.error(`[HYBRID] Bóc kỹ năng bằng từ điển lỗi: ${err.message}`);
  }

  // Chạy NLP chỉ ở chế độ hybrid (parseByNlp tự nuốt lỗi, vẫn bọc thêm cho chắc)
  let nlpResult = emptyNlpResult();
  if (mode === 'hybrid') {
    try {
      nlpResult = await parseByNlp(rawText, ruleResult.sections);
    } catch (err) {
      errors.nlp = err.message;
      console.error(`[HYBRID] NLP parser lỗi: ${err.message}`);
    }

    // parseByNlp tự nuốt lỗi và trả cờ failed, ghi nhận lại để tầng trên biết
    if (nlpResult.failed && !errors.nlp) {
      errors.nlp = 'Không gọi được dịch vụ NLP';
    }
  }

  const skills = await mergeSkills(nlpResult.skills || [], ruleSkills, index);

  const experiences = (nlpResult.experiences || []).map((experience) => {
    const dates = resolveExperienceDates(experience);
    return {
      position: experience.position || null,
      companyName: experience.companyName || null,
      startDate: dates.startDate,
      endDate: dates.endDate,
      description: experience.description || null,
      evidence: experience.evidence || null,
      source: SOURCE_NLP,
      dateSource: dates.dateSource,
    };
  });

  const educationSection = ruleResult.sections ? ruleResult.sections.education : null;
  const educations = (nlpResult.educations || []).map((education) => {
    const dates = resolveEducationDates(education, educationSection);
    return {
      school: education.school || null,
      major: education.major || null,
      degree: education.degree || null,
      startDate: dates.startDate,
      endDate: dates.endDate,
      source: SOURCE_NLP,
      dateSource: dates.dateSource,
    };
  });

  return {
    mode,
    // Liên hệ: chỉ rule-based mới bóc được, NLP không trả các trường này
    email: ruleResult.email,
    phone: ruleResult.phone,
    urls: ruleResult.urls || [],
    // Thông tin cá nhân: lấy từ NLP
    fullName: nlpResult.fullName,
    headline: nlpResult.headline,
    // Kỹ năng: NLP + từ điển (hybrid) hoặc chỉ từ điển (rule)
    skills,
    // Kinh nghiệm, học vấn: chỉ NLP bóc được, chế độ rule luôn rỗng
    experiences,
    educations,
    // Mốc thời gian tổng hợp của rule, dùng để đối chiếu số năm kinh nghiệm
    dateRanges: ruleResult.dateRanges || [],
    totalYears: ruleResult.totalYears || 0,
    sections: ruleResult.sections,
    errors,
  };
}

module.exports = { parseCV, toDate, dedupeSkills };
