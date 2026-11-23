// Liên kết GitHub / LinkedIn (T35m). Cùng quy tắc với backend/src/utils/webLink.js để báo lỗi ngay dưới ô nhập:
// chỉ http:// hoặc https://, tối đa 255 ký tự, rỗng = không có liên kết. Backend vẫn là nơi kiểm cuối cùng.
export const WEB_LINK_MAX_LENGTH = 255

export const LINK_FIELDS = [
  {
    name: 'githubUrl',
    label: 'GitHub',
    errorLabel: 'Liên kết GitHub',
    example: 'https://github.com/tentaikhoan',
  },
  {
    name: 'linkedinUrl',
    label: 'LinkedIn',
    errorLabel: 'Liên kết LinkedIn',
    example: 'https://www.linkedin.com/in/tentaikhoan',
  },
]

// Câu lỗi (giống câu của API) hoặc '' khi hợp lệ / để trống
export function checkWebLink(value, { errorLabel, example }) {
  const link = typeof value === 'string' ? value.trim() : ''
  if (!link) return ''
  if (link.length > WEB_LINK_MAX_LENGTH) return `${errorLabel} tối đa ${WEB_LINK_MAX_LENGTH} ký tự.`
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(link)
  if (!scheme) return `${errorLabel} cần có http:// hoặc https:// ở đầu, ví dụ ${example}.`
  const protocol = scheme[1].toLowerCase()
  if (protocol !== 'http' && protocol !== 'https') {
    return `${errorLabel} chỉ nhận địa chỉ web bắt đầu bằng http:// hoặc https://.`
  }
  let parsed = null
  try {
    parsed = new URL(link)
  } catch {
    parsed = null
  }
  if (!parsed || !parsed.hostname || /\s/.test(link) || !/^https?:\/\/[^/?#\s]/i.test(link)) {
    return `${errorLabel} không phải địa chỉ web hợp lệ. Ví dụ: ${example}.`
  }
  return ''
}

// Chỉ dùng làm href khi là http(s) hợp lệ: dữ liệu lạ (vd ghi thẳng vào DB) không bao giờ thành href javascript:
export function isWebLink(value) {
  return Boolean(value) && checkWebLink(value, { errorLabel: '', example: '' }) === ''
}

// Dạng gọn để hiển thị / in: bỏ http(s)://, "www." và dấu "/" cuối. https://www.github.com/abc/ -> github.com/abc
export function shortWebLink(value) {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
}
