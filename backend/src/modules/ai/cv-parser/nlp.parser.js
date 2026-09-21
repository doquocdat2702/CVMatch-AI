// Parser dựa trên LLM (Google Gemini), gọi qua HTTP bằng fetch có sẵn của Node.
// Nguyên tắc: lỗi mạng hay JSON hỏng đều KHÔNG throw, chỉ ghi log và trả về cấu trúc rỗng.
const env = require('../../../config/env');

const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_TOKENS = 8000;
const TIMEOUT_MS = 60000;
const MAX_RETRY = 2; // tối đa 2 lần thử lại, tổng cộng 3 lần gọi

// Cấu trúc rỗng, dùng khi không gọi được LLM hoặc kết quả không hợp lệ
function emptyResult() {
  return {
    fullName: null,
    headline: null,
    skills: [],
    experiences: [],
    educations: [],
  };
}

const SYSTEM_PROMPT = [
  'Bạn là công cụ bóc tách thông tin từ CV ứng viên.',
  'CV có thể thuộc BẤT KỲ ngành nghề nào: marketing, kế toán, nhân sự, thiết kế, kỹ thuật,',
  'dịch vụ khách hàng, y tế, giáo dục, xây dựng... TUYỆT ĐỐI KHÔNG giả định CV thuộc ngành',
  'công nghệ thông tin và không suy diễn kỹ năng theo ngành.',
  '',
  'QUY TẮC BẮT BUỘC:',
  '1. Chỉ trả về JSON thuần. Không markdown, không dấu ```, không lời giải thích, không chú thích.',
  '2. Chỉ lấy thông tin có thật trong CV. CẤM bịa, CẤM suy đoán, CẤM bổ sung kiến thức bên ngoài.',
  '3. Không tìm thấy thì trả null (với trường đơn) hoặc mảng rỗng (với danh sách).',
  '4. Mỗi skill và mỗi experience phải kèm "evidence" là đoạn TRÍCH NGUYÊN VĂN từ CV,',
  '   copy đúng từng chữ, không diễn giải lại, không dịch, không rút gọn.',
  '5. Ngày tháng theo định dạng "YYYY-MM-DD" hoặc "YYYY-MM"; không rõ thì để null.',
  '   Công việc đang làm thì endDate = null.',
  '',
  'Cấu trúc JSON phải trả về đúng như sau:',
  '{',
  '  "fullName": string | null,',
  '  "headline": string | null,',
  '  "skills": [{ "rawName": string, "evidence": string }],',
  '  "experiences": [{ "position": string, "companyName": string, "startDate": string | null,',
  '                    "endDate": string | null, "description": string | null, "evidence": string }],',
  '  "educations": [{ "school": string, "major": string | null, "degree": string | null,',
  '                   "startDate": string | null, "endDate": string | null }]',
  '}',
].join('\n');

const NULLABLE_TEXT = { type: 'STRING', nullable: true };

// Schema ép model trả đúng cấu trúc (Gemini structured output).
// evidence để bắt buộc, nhờ vậy model không bỏ trống dẫn chứng.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    fullName: NULLABLE_TEXT,
    headline: NULLABLE_TEXT,
    skills: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          rawName: { type: 'STRING' },
          evidence: { type: 'STRING' },
        },
        required: ['rawName', 'evidence'],
      },
    },
    experiences: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          position: { type: 'STRING' },
          companyName: { type: 'STRING' },
          startDate: NULLABLE_TEXT,
          endDate: NULLABLE_TEXT,
          description: NULLABLE_TEXT,
          evidence: { type: 'STRING' },
        },
        required: ['position', 'companyName', 'evidence'],
      },
    },
    educations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          school: { type: 'STRING' },
          major: NULLABLE_TEXT,
          degree: NULLABLE_TEXT,
          startDate: NULLABLE_TEXT,
          endDate: NULLABLE_TEXT,
        },
        required: ['school'],
      },
    },
  },
  required: ['fullName', 'headline', 'skills', 'experiences', 'educations'],
};

// Ghép phần section đã tách được bằng rule để LLM bám sát bố cục CV
function buildUserPrompt(rawText, sections) {
  const parts = [];

  if (sections && typeof sections === 'object') {
    const labels = {
      objective: 'MUC TIEU',
      experience: 'KINH NGHIEM',
      education: 'HOC VAN',
      skills: 'KY NANG',
      projects: 'DU AN',
      certifications: 'CHUNG CHI',
    };

    const known = Object.keys(labels)
      .filter((key) => sections[key])
      .map((key) => `[${labels[key]}]\n${sections[key]}`);

    if (known.length > 0) {
      parts.push('Các phần đã tách được từ CV (chỉ để tham khảo bố cục):');
      parts.push(known.join('\n\n'));
    }
  }

  parts.push('Toàn bộ nội dung CV:');
  parts.push('"""');
  parts.push(String(rawText || ''));
  parts.push('"""');
  parts.push('Hãy trả về JSON theo đúng cấu trúc đã quy định.');

  return parts.join('\n');
}

// Gỡ rào ```json nếu model lỡ trả kèm, rồi cắt lấy phần JSON
function stripCodeFence(text) {
  let cleaned = String(text || '').trim();

  cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '').replace(/```$/, '').trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

function toTextOrNull(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

// Chuẩn hóa kết quả LLM về đúng cấu trúc, loại bỏ mục thiếu dữ liệu bắt buộc
function normalizeResult(parsed) {
  const result = emptyResult();

  if (!parsed || typeof parsed !== 'object') {
    return result;
  }

  result.fullName = toTextOrNull(parsed.fullName);
  result.headline = toTextOrNull(parsed.headline);

  if (Array.isArray(parsed.skills)) {
    result.skills = parsed.skills
      .filter((item) => item && toTextOrNull(item.rawName))
      .map((item) => ({
        rawName: toTextOrNull(item.rawName),
        evidence: toTextOrNull(item.evidence),
      }));
  }

  if (Array.isArray(parsed.experiences)) {
    result.experiences = parsed.experiences
      .filter((item) => item && (toTextOrNull(item.position) || toTextOrNull(item.companyName)))
      .map((item) => ({
        position: toTextOrNull(item.position),
        companyName: toTextOrNull(item.companyName),
        startDate: toTextOrNull(item.startDate),
        endDate: toTextOrNull(item.endDate),
        description: toTextOrNull(item.description),
        evidence: toTextOrNull(item.evidence),
      }));
  }

  if (Array.isArray(parsed.educations)) {
    result.educations = parsed.educations
      .filter((item) => item && toTextOrNull(item.school))
      .map((item) => ({
        school: toTextOrNull(item.school),
        major: toTextOrNull(item.major),
        degree: toTextOrNull(item.degree),
        startDate: toTextOrNull(item.startDate),
        endDate: toTextOrNull(item.endDate),
      }));
  }

  return result;
}

// Gọi API một lần, có timeout. useSchema = false để gọi lại khi API từ chối schema.
async function callLlmOnce(userPrompt, useSchema) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const generationConfig = {
    // Ép model trả JSON thuần, không kèm markdown
    responseMimeType: 'application/json',
    maxOutputTokens: MAX_TOKENS,
    temperature: 0,
  };

  if (useSchema) {
    generationConfig.responseSchema = RESPONSE_SCHEMA;
  }

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

async function parseByNlp(rawText, sections) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    console.warn('[NLP] rawText rỗng, bỏ qua bước gọi LLM');
    return emptyResult();
  }

  if (!env.GEMINI_API_KEY) {
    console.warn('[NLP] Thiếu GEMINI_API_KEY trong .env, bỏ qua bước NLP');
    return emptyResult();
  }

  const userPrompt = buildUserPrompt(rawText, sections);
  let useSchema = true;

  for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
    try {
      const responseText = await callLlmOnce(userPrompt, useSchema);
      const jsonText = stripCodeFence(responseText);

      try {
        return normalizeResult(JSON.parse(jsonText));
      } catch (parseErr) {
        // JSON hỏng: thử lại nếu còn lượt, hết lượt thì trả cấu trúc rỗng
        console.error(
          `[NLP] Lần ${attempt + 1}: JSON trả về không hợp lệ - ${parseErr.message}`
        );
        if (attempt === MAX_RETRY) {
          return emptyResult();
        }
      }
    } catch (err) {
      const reason = err.name === 'AbortError' ? `quá ${TIMEOUT_MS}ms không phản hồi` : err.message;
      console.error(`[NLP] Lần ${attempt + 1} gọi LLM thất bại: ${reason}`);

      // API từ chối schema thì lần sau gọi lại không kèm schema
      if (useSchema && err.httpStatus === 400) {
        console.warn('[NLP] API không chấp nhận responseSchema, thử lại không dùng schema');
        useSchema = false;
      }

      if (attempt === MAX_RETRY) {
        return emptyResult();
      }
    }
  }

  return emptyResult();
}

module.exports = { parseByNlp };
