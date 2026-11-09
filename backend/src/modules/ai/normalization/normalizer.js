// Chuẩn hóa tên kỹ năng về dạng canonical trước khi đối chiếu với bảng Skill.
//
// QUY TẮC BẮT BUỘC: CẤM gộp kỹ năng khác nhau.
// React khác React Native, Java khác JavaScript, Excel khác Excel VBA,
// SQL khác MySQL, Photoshop khác Illustrator.
// Chỉ gộp khi hai tên nằm CÙNG MỘT MỤC aliases trong skill.dictionary.json.
// Không so khớp gần đúng, không đoán theo tiền tố hay độ tương đồng chuỗi:
// không khớp thì giữ nguyên tên gốc và để skillId = null.

const prisma = require('../../../config/prisma');
const dictionary = require('./skill.dictionary.json');

const COMBINING_MARKS = new RegExp(
  '[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']',
  'g'
);

// Chuẩn hóa chung cho mọi loại text (dùng lại cho JD ở giai đoạn sau):
// bỏ dấu tiếng Việt, lowercase, bỏ dấu câu thừa, gộp khoảng trắng kép
function normalizeText(raw) {
  if (typeof raw !== 'string') {
    return '';
  }

  return raw
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9+#/.&\s-]/g, ' ')
    .replace(/[.\-_]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Dựng chỉ mục từ điển: khóa là tên đã chuẩn hóa, giá trị là canonical.
// Một khóa bị hai mục khác nhau tranh nhau thì bỏ hẳn khóa đó cho an toàn,
// tránh gộp nhầm hai kỹ năng khác nhau.
function buildDictionaryIndex() {
  const index = new Map();
  const conflicts = new Set();

  for (const entry of dictionary) {
    const names = [entry.canonical, ...(entry.aliases || [])];

    for (const name of names) {
      const key = normalizeText(name);
      if (!key) {
        continue;
      }

      const existing = index.get(key);
      if (existing && existing !== entry.canonical) {
        conflicts.add(key);
        continue;
      }
      index.set(key, entry.canonical);
    }
  }

  for (const key of conflicts) {
    console.warn(`[NORMALIZE] Bỏ khóa "${key}" vì trùng giữa nhiều mục trong từ điển`);
    index.delete(key);
  }

  return index;
}

const DICTIONARY_INDEX = buildDictionaryIndex();

// Tra từ điển: khớp thì trả canonical, không khớp thì giữ nguyên tên gốc
function normalizeSkillName(raw) {
  const original = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';

  if (!original) {
    return { canonical: '', matched: false };
  }

  const key = normalizeText(original);
  const canonical = DICTIONARY_INDEX.get(key);

  if (canonical) {
    return { canonical, matched: true };
  }

  return { canonical: original, matched: false };
}

// Nạp toàn bộ bảng Skill một lần và dựng chỉ mục theo name + aliases.
// aliases lưu dạng chuỗi ngăn cách bởi dấu phẩy nên phải tách trước khi so khớp.
async function loadSkillIndex() {
  const skills = await prisma.skill.findMany();
  const index = new Map();

  for (const skill of skills) {
    const nameKey = normalizeText(skill.name);
    if (nameKey && !index.has(nameKey)) {
      index.set(nameKey, skill.id);
    }

    const aliasList = typeof skill.aliases === 'string' ? skill.aliases.split(',') : [];
    for (const alias of aliasList) {
      const aliasKey = normalizeText(alias);
      if (aliasKey && !index.has(aliasKey)) {
        index.set(aliasKey, skill.id);
      }
    }
  }

  return index;
}

// ===== Phần trong ngoặc của tên kỹ năng (F1) =====
// "JavaScript (ES6+)"                  -> base "JavaScript", inner ["ES6+"]
// "Cơ sở dữ liệu (MySQL, PostgreSQL)"  -> base "Cơ sở dữ liệu", inner ["MySQL, PostgreSQL"]
// Nhận ( ) và [ ], có lồng nhau; ngoặc mở không đóng thì phần sau ngoặc tính là trong ngoặc.

const PAREN_GROUP = /[([]([^()[\]]*)[)\]]/g;

function collapseSpaces(text) {
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
}

function stripParentheses(raw) {
  let base = typeof raw === 'string' ? raw : '';
  const inner = [];

  // Lặp để xử lý ngoặc lồng: lần đầu bỏ ngoặc trong cùng, lần sau bỏ ngoặc ngoài
  let previous;
  do {
    previous = base;
    base = base.replace(PAREN_GROUP, (match, content) => {
      inner.push(content);
      return ' ';
    });
  } while (base !== previous);

  const openAt = base.search(/[([]/);
  if (openAt !== -1) {
    inner.push(base.slice(openAt + 1));
    base = base.slice(0, openAt);
  }

  base = collapseSpaces(base.replace(/[)\]]/g, ' ')).replace(/^[\s,;:–-]+|[\s,;:–-]+$/g, '');
  return { base, inner: inner.map(collapseSpaces).filter(Boolean) };
}

// Khóa so tên kỹ năng: bỏ phần trong ngoặc, rồi normalizeText (bỏ dấu, chữ thường, gộp khoảng trắng).
// Dùng chung cho gộp kỹ năng khi phân tích CV và ghép theo tên khi đối chiếu (F2)
function skillNameKey(raw) {
  const { base } = stripParentheses(raw);
  return normalizeText(base || raw);
}

// Tra skillId theo tên (bỏ phần trong ngoặc): thử tên chuẩn của skill.dictionary.json trước,
// rồi tới chính tên đó (bảng Skill có thể có name / alias mà từ điển JSON chưa có). Không khớp trả null.
function lookupSkillId(name, skillIndex) {
  if (!skillIndex || typeof name !== 'string') {
    return null;
  }
  const { base } = stripParentheses(name);
  const target = base || collapseSpaces(name.replace(/[()[\]]/g, ' '));
  if (!target) {
    return null;
  }

  const { canonical } = normalizeSkillName(target);
  for (const key of [normalizeText(canonical), normalizeText(target)]) {
    if (key && skillIndex.has(key)) {
      return skillIndex.get(key);
    }
  }
  return null;
}

// Khóa dưới 3 ký tự là khóa ngắn (như MIN_DICTIONARY_KEY_LENGTH của rule.parser.js)
const MIN_KEY_LENGTH = 3;
const INNER_SEPARATOR = /\s*[,;]\s*|\s+(?:và|hoặc|and|or)\s+/i;

// Một cụm trong ngoặc có phải kỹ năng đã biết không. Khóa ngắn dưới 3 ký tự (QA, BA, AI, HR...)
// chỉ nhận khi viết HOA đúng nguyên khóa và đứng riêng, cùng quy tắc với bóc kỹ năng bằng từ điển
function innerPartSkillId(part, skillIndex) {
  const text = collapseSpaces(part);
  const key = normalizeText(text);
  if (!key) {
    return null;
  }
  if (key.length < MIN_KEY_LENGTH && text !== key.toUpperCase()) {
    return null;
  }
  return lookupSkillId(text, skillIndex);
}

// Các kỹ năng đã biết trong một đoạn ngoặc. Cả đoạn là một kỹ năng ("CI/CD", "C&B") thì lấy nguyên;
// không thì tách theo , ; và / hoặc / and / or, cụm nào chưa khớp thì thử tách tiếp theo / và &.
// Cụm mô tả (năm, cấp độ, "nâng cao", "TOEIC 750"...) không khớp Skill nào nên bị bỏ qua
function findInnerSkills(content, skillIndex) {
  const wholeId = innerPartSkillId(content, skillIndex);
  if (wholeId !== null) {
    return [{ name: collapseSpaces(content), skillId: wholeId }];
  }

  const found = [];
  for (const part of content.split(INNER_SEPARATOR)) {
    const partId = innerPartSkillId(part, skillIndex);
    if (partId !== null) {
      found.push({ name: collapseSpaces(part), skillId: partId });
      continue;
    }
    for (const piece of part.split(/[/&]/)) {
      const pieceId = innerPartSkillId(piece, skillIndex);
      if (pieceId !== null) {
        found.push({ name: collapseSpaces(piece), skillId: pieceId });
      }
    }
  }
  return found;
}

// Chuẩn hóa MỘT tên kỹ năng thành một hay nhiều kỹ năng (F1), dùng chung cho kỹ năng của CV
// (rule, Gemini) và tên yêu cầu khi phân tích JD:
//   "JavaScript (ES6+)"                 -> JavaScript
//   "Microsoft Excel (nâng cao)"        -> Microsoft Excel (tên chuẩn Excel)
//   "Cơ sở dữ liệu (MySQL, PostgreSQL)" -> MySQL, PostgreSQL (phần ngoài ngoặc không phải kỹ năng đã biết nên bỏ)
//   "Java (Spring Boot)"                -> Java, Spring Boot
// Trả [{ name, canonical, skillId }]: name là tên đã bỏ ngoặc, canonical theo skill.dictionary.json.
function expandSkillName(raw, skillIndex) {
  const original = collapseSpaces(raw);
  if (!original) {
    return [];
  }

  const { base, inner } = stripParentheses(original);
  const innerSkills = [];
  for (const content of inner) {
    innerSkills.push(...findInnerSkills(content, skillIndex));
  }

  const items = [];
  const baseName = base || collapseSpaces(original.replace(/[()[\]]/g, ' '));
  const baseId = lookupSkillId(baseName, skillIndex);
  // Phần ngoài ngoặc giữ lại khi là kỹ năng đã biết, hoặc khi trong ngoặc không có kỹ năng nào
  if (baseName && (baseId !== null || innerSkills.length === 0)) {
    items.push({ name: baseName, skillId: baseId });
  }
  items.push(...innerSkills);

  const seenIds = new Set();
  const seenNames = new Set();
  const result = [];
  for (const item of items) {
    const nameKey = normalizeText(item.name);
    if ((item.skillId !== null && seenIds.has(item.skillId)) || seenNames.has(nameKey)) {
      continue;
    }
    if (item.skillId !== null) {
      seenIds.add(item.skillId);
    }
    seenNames.add(nameKey);
    result.push({ ...item, canonical: normalizeSkillName(item.name).canonical });
  }
  return result;
}

// Tra bảng Skill theo tên canonical. Không khớp trả null, KHÔNG tự tạo Skill mới.
// Truyền sẵn index khi xử lý hàng loạt để khỏi query lại nhiều lần.
// Từ F1: bỏ phần trong ngoặc trước khi tra ("Excel (nâng cao)" -> Excel)
async function resolveSkillId(canonical, skillIndex) {
  if (!normalizeText(canonical)) {
    return null;
  }

  const index = skillIndex || (await loadSkillIndex());
  return lookupSkillId(canonical, index);
}

module.exports = {
  normalizeText,
  normalizeSkillName,
  resolveSkillId,
  loadSkillIndex,
  stripParentheses,
  skillNameKey,
  lookupSkillId,
  expandSkillName,
};
