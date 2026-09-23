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

// Tra bảng Skill theo tên canonical. Không khớp trả null, KHÔNG tự tạo Skill mới.
// Truyền sẵn index khi xử lý hàng loạt để khỏi query lại nhiều lần.
async function resolveSkillId(canonical, skillIndex) {
  const key = normalizeText(canonical);
  if (!key) {
    return null;
  }

  const index = skillIndex || (await loadSkillIndex());
  return index.has(key) ? index.get(key) : null;
}

module.exports = {
  normalizeText,
  normalizeSkillName,
  resolveSkillId,
  loadSkillIndex,
};
