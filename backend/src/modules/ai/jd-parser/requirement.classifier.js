// Phân loại mức độ của một yêu cầu trong JD: REQUIRED | PREFERRED | OPTIONAL.
// CHỈ 3 giá trị này, không thêm mức độ nào khác, không chấm trọng số.
//
// Thứ tự xử lý:
//   1. Rule từ khóa chạy trước (không tốn lượt gọi API).
//   2. Rule không quyết được thì hỏi LLM, bắt trả ĐÚNG MỘT TỪ trong 3 giá trị.
//   3. LLM trả giá trị lạ cho một mục -> mục đó mặc định OPTIONAL.
//
// classifyBatch gộp toàn bộ yêu cầu chưa quyết được vào MỘT lần gọi LLM;
// lỗi tạm thời (mạng, timeout, 5xx) thì thử lại theo llm-retry, không thử lại 429 / 401 / 403;
// thiếu GEMINI_API_KEY hoặc LLM vẫn lỗi thì throw lỗi 503, KHÔNG lùi về OPTIONAL.
// classifyRequirement (phân loại lẻ một câu) vẫn lùi về OPTIONAL khi LLM lỗi.
//
// NLP_MODE=rule: KHÔNG gọi LLM; mục rule không quyết được -> PREFERRED
// (vẫn hiện trong ma trận đối chiếu nhưng không bị coi là bắt buộc).

const env = require('../../../config/env');
const { callWithRetry } = require('../llm-retry');

const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 60000;

const REQUIREMENT_TYPES = ['REQUIRED', 'PREFERRED', 'OPTIONAL'];
const DEFAULT_TYPE = 'OPTIONAL';
const RULE_MODE_TYPE = 'PREFERRED';

// ===== Bước 1: rule từ khóa =====

const COMBINING_MARKS = new RegExp(
  '[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']',
  'g'
);

function normalizeForMatch(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Từ khóa đã bỏ dấu để so khớp
const REQUIRED_KEYWORDS = [
  'yeu cau',
  'bat buoc',
  'phai co',
  'toi thieu',
  'thanh thao',
  'must have',
  'required',
];

const PREFERRED_KEYWORDS = [
  'uu tien',
  'la loi the',
  'biet them',
  'nice to have',
  'plus',
];

// Vị trí xuất hiện sớm nhất của một nhóm từ khóa, không có thì -1
function findEarliestKeyword(haystack, keywords) {
  let earliest = -1;

  keywords.forEach((keyword) => {
    const index = haystack.indexOf(keyword);
    if (index !== -1 && (earliest === -1 || index < earliest)) {
      earliest = index;
    }
  });

  return earliest;
}

// Rule quyết định được thì trả REQUIRED / PREFERRED, không thì trả null.
// Câu có cả hai nhóm từ khóa ("Yêu cầu ... , ưu tiên ...") thì nhóm xuất hiện
// SỚM HƠN thắng, vì cụm dẫn nhập đứng trước chi phối cả câu.
// Bằng nhau về vị trí thì lấy PREFERRED, tránh nâng yêu cầu lên mức bắt buộc.
function classifyByRule(rawText) {
  const haystack = normalizeForMatch(rawText);
  if (!haystack) {
    return null;
  }

  const requiredAt = findEarliestKeyword(haystack, REQUIRED_KEYWORDS);
  const preferredAt = findEarliestKeyword(haystack, PREFERRED_KEYWORDS);

  if (requiredAt === -1 && preferredAt === -1) {
    return null;
  }
  if (requiredAt === -1) {
    return 'PREFERRED';
  }
  if (preferredAt === -1) {
    return 'REQUIRED';
  }

  return preferredAt <= requiredAt ? 'PREFERRED' : 'REQUIRED';
}

// ===== Bước 2: hỏi LLM =====

const SYSTEM_PROMPT = [
  'Bạn là công cụ phân loại mức độ của yêu cầu trong tin tuyển dụng (JD).',
  'JD có thể thuộc BẤT KỲ ngành nghề nào: marketing, kế toán, nhân sự, thiết kế,',
  'kỹ thuật, dịch vụ khách hàng, y tế, giáo dục, xây dựng... TUYỆT ĐỐI KHÔNG giả định',
  'JD thuộc ngành công nghệ thông tin.',
  '',
  'Chỉ được dùng ĐÚNG MỘT trong ba giá trị sau:',
  '- REQUIRED: yêu cầu bắt buộc, thiếu là không đạt.',
  '- PREFERRED: yêu cầu được ưu tiên, là lợi thế nhưng không bắt buộc.',
  '- OPTIONAL: nêu thêm cho rõ, không bắt buộc và cũng không nhấn mạnh ưu tiên.',
  '',
  'QUY TẮC BẮT BUỘC:',
  '1. Chỉ căn cứ vào chính câu được cho. CẤM suy diễn, CẤM bổ sung kiến thức bên ngoài.',
  '2. Không giải thích, không thêm chữ nào khác ngoài giá trị phân loại.',
  '3. Không nghĩ ra mức độ mới, không cho điểm, không xếp trọng số.',
  '4. Không chắc chắn thì trả OPTIONAL.',
].join('\n');

function isValidType(value) {
  return typeof value === 'string' && REQUIREMENT_TYPES.includes(value.trim().toUpperCase());
}

// Lấy đúng một từ trong 3 giá trị từ text LLM trả về, sai thì null
function pickType(text) {
  const cleaned = String(text || '')
    .replace(/```[a-zA-Z]*/g, '')
    .replace(/[^a-zA-Z]+/g, ' ')
    .trim()
    .toUpperCase();

  if (!cleaned) {
    return null;
  }

  const words = cleaned.split(/\s+/).filter((word) => REQUIREMENT_TYPES.includes(word));

  // Đúng một giá trị hợp lệ mới nhận, trả lung tung nhiều giá trị thì coi là sai
  return words.length === 1 ? words[0] : null;
}

// Gọi Gemini một lần, có timeout. Lỗi thì throw, hàm gọi tự quyết lùi về OPTIONAL hay báo 503.
async function callLlm(userPrompt, responseSchema) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const generationConfig = {
    maxOutputTokens: 2000,
    temperature: 0,
  };

  if (responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = responseSchema;
  }

  // Mỗi lần thật sự gửi request tới Gemini đều ghi một dòng, để kiểm tra chế độ rule không gọi Gemini
  console.log('[GEMINI] Gửi request phân loại yêu cầu JD');

  try {
    const response = await fetch(`${API_BASE_URL}/${env.GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Đặt key ở header, không đưa vào URL
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const err = new Error(`LLM trả về HTTP ${response.status}: ${detail.slice(0, 200)}`);
      // Để llm-retry phân biệt lỗi tạm thời (5xx) với lỗi không thử lại (429, 401, 403...)
      err.httpStatus = response.status;
      throw err;
    }

    const payload = await response.json();

    if (payload.promptFeedback && payload.promptFeedback.blockReason) {
      throw new Error(`LLM từ chối xử lý: ${payload.promptFeedback.blockReason}`);
    }

    const candidate = Array.isArray(payload.candidates) ? payload.candidates[0] : null;
    const parts = candidate && candidate.content ? candidate.content.parts : null;
    const text = Array.isArray(parts)
      ? parts
          .filter((part) => typeof part.text === 'string' && !part.thought)
          .map((part) => part.text)
          .join('')
      : '';

    if (!text.trim()) {
      throw new Error('LLM không trả về nội dung text');
    }

    return text;
  } finally {
    clearTimeout(timer);
  }
}

// ===== Hàm chính =====

// classifyRequirement(rawText) -> 'REQUIRED' | 'PREFERRED' | 'OPTIONAL'
async function classifyRequirement(rawText) {
  const text = typeof rawText === 'string' ? rawText.trim() : '';
  if (!text) {
    return DEFAULT_TYPE;
  }

  const byRule = classifyByRule(text);
  if (byRule) {
    return byRule;
  }

  if (env.NLP_MODE === 'rule') {
    return RULE_MODE_TYPE;
  }

  if (!env.GEMINI_API_KEY) {
    console.warn('[JD] Thiếu GEMINI_API_KEY trong .env, mức độ yêu cầu mặc định OPTIONAL');
    return DEFAULT_TYPE;
  }

  const userPrompt = [
    'Phân loại mức độ của yêu cầu sau.',
    'Chỉ trả về ĐÚNG MỘT TỪ: REQUIRED hoặc PREFERRED hoặc OPTIONAL.',
    '',
    'Yêu cầu:',
    '"""',
    text,
    '"""',
  ].join('\n');

  try {
    const responseText = await callLlm(userPrompt, null);
    const type = pickType(responseText);

    if (!type) {
      console.error(`[JD] LLM trả giá trị không hợp lệ: "${responseText.slice(0, 80)}"`);
      return DEFAULT_TYPE;
    }

    return type;
  } catch (err) {
    const reason = err.name === 'AbortError' ? `quá ${TIMEOUT_MS}ms không phản hồi` : err.message;
    console.error(`[JD] Gọi LLM phân loại thất bại: ${reason}`);
    return DEFAULT_TYPE;
  }
}

// Schema ép LLM trả mảng đúng 3 giá trị cho phép
const BATCH_RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      index: { type: 'INTEGER' },
      type: { type: 'STRING', enum: REQUIREMENT_TYPES },
    },
    required: ['index', 'type'],
  },
};

const NLP_UNAVAILABLE_MESSAGE = 'Dịch vụ NLP đang không khả dụng, chưa phân tích được JD';

// Còn mục rule không quyết được mà không hỏi được LLM: báo 503, không đoán bừa OPTIONAL
function nlpUnavailableError() {
  const err = new Error(NLP_UNAVAILABLE_MESSAGE);
  err.statusCode = 503;
  return err;
}

// classifyBatch(requirements) -> { types: ['REQUIRED', 'OPTIONAL', ...], unresolvedCount }
// types cùng thứ tự đầu vào; unresolvedCount = số mục rule không phân loại được
// (chế độ rule: gán PREFERRED; chế độ hybrid: đã hỏi LLM).
// requirements nhận mảng string hoặc mảng { rawText } do extractRequirements trả về.
// Toàn bộ mục rule không quyết được gộp vào MỘT lần gọi LLM.
// Rule quyết được hết thì không gọi LLM. Chế độ hybrid còn mục phải hỏi LLM mà thiếu
// GEMINI_API_KEY hoặc gọi LLM lỗi thì throw lỗi 503 (statusCode = 503).
async function classifyBatch(requirements) {
  if (!Array.isArray(requirements) || requirements.length === 0) {
    return { types: [], unresolvedCount: 0 };
  }

  const texts = requirements.map((item) => {
    if (typeof item === 'string') {
      return item.trim();
    }
    if (item && typeof item.rawText === 'string') {
      return item.rawText.trim();
    }
    return '';
  });

  const results = texts.map((text) => (text ? classifyByRule(text) : DEFAULT_TYPE));
  const pendingIndexes = results
    .map((type, index) => (type ? -1 : index))
    .filter((index) => index !== -1);

  const unresolvedCount = pendingIndexes.length;
  if (unresolvedCount === 0) {
    return { types: results, unresolvedCount };
  }

  // Chế độ rule: không gọi LLM, mục rule không quyết được để PREFERRED
  if (env.NLP_MODE === 'rule') {
    pendingIndexes.forEach((index) => {
      results[index] = RULE_MODE_TYPE;
    });
    return { types: results, unresolvedCount };
  }

  if (!env.GEMINI_API_KEY) {
    console.warn(`[JD] Thiếu GEMINI_API_KEY trong .env, ${pendingIndexes.length} yêu cầu chưa phân loại được`);
    throw nlpUnavailableError();
  }

  const listing = pendingIndexes
    .map((index, order) => `${order}. ${texts[index]}`)
    .join('\n');

  const userPrompt = [
    `Phân loại mức độ cho ${pendingIndexes.length} yêu cầu dưới đây.`,
    'Trả về JSON là một mảng, mỗi phần tử gồm "index" là số thứ tự của yêu cầu',
    'và "type" là ĐÚNG MỘT TỪ: REQUIRED hoặc PREFERRED hoặc OPTIONAL.',
    'Phải trả đủ đúng số phần tử, không bỏ sót, không thêm phần tử lạ.',
    '',
    'Danh sách yêu cầu:',
    '"""',
    listing,
    '"""',
  ].join('\n');

  try {
    // Chỉ lỗi tạm thời (mạng, timeout, 5xx) mới được gọi lại, xem llm-retry
    const responseText = await callWithRetry(
      () => callLlm(userPrompt, BATCH_RESPONSE_SCHEMA),
      (err, attempt, willRetry) => {
        if (willRetry) {
          const reason = err.name === 'AbortError' ? `quá ${TIMEOUT_MS}ms không phản hồi` : err.message;
          console.error(`[JD] Lần ${attempt} gọi LLM thất bại, lỗi tạm thời, thử lại: ${reason}`);
        }
      }
    );
    const parsed = JSON.parse(responseText);

    if (!Array.isArray(parsed)) {
      throw new Error('LLM không trả về mảng');
    }

    const byOrder = new Map();
    parsed.forEach((entry) => {
      if (!entry || !isValidType(entry.type)) {
        return;
      }
      const order = Number(entry.index);
      if (Number.isInteger(order) && order >= 0 && order < pendingIndexes.length) {
        byOrder.set(order, entry.type.trim().toUpperCase());
      }
    });

    // Mục nào LLM không trả hoặc trả sai giá trị thì mặc định OPTIONAL
    pendingIndexes.forEach((index, order) => {
      results[index] = byOrder.get(order) || DEFAULT_TYPE;
    });
  } catch (err) {
    const reason = err.name === 'AbortError' ? `quá ${TIMEOUT_MS}ms không phản hồi` : err.message;
    console.error(`[JD] Gọi LLM phân loại theo lô thất bại: ${reason}`);
    throw nlpUnavailableError();
  }

  return { types: results, unresolvedCount };
}

module.exports = { classifyRequirement, classifyBatch, REQUIREMENT_TYPES };
