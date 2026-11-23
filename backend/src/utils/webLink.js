// Kiểm liên kết web do người dùng nhập (T35m): GitHub, LinkedIn của ứng viên. Dùng CHUNG cho mọi trường liên kết mới.
// Chỉ nhận địa chỉ http:// hoặc https://; mọi giao thức khác (javascript:, data:, file:, vbscript:, ftp:...) bị từ chối
// vì giá trị này được đặt vào href (trang Hồ sơ, 3 mẫu CV). Frontend có bản cùng quy tắc: frontend/src/utils/webLink.js
// (Company.website có kiểm riêng từ QA2, QA-11, ở company.service.js)
const WEB_LINK_MAX_LENGTH = 255;

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

// value: giá trị client gửi (đã biết là không undefined). label: tên trường trên giao diện. example: ví dụ đúng.
// Trả chuỗi đã cắt khoảng trắng hai đầu, hoặc null khi rỗng (xóa liên kết). Sai thì ném lỗi 400 câu tiếng Việt
function parseWebLink(value, { label, example }) {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw badRequest(`${label} không hợp lệ. Ví dụ: ${example}.`);
  }
  const link = value.trim();
  if (!link) return null;

  if (link.length > WEB_LINK_MAX_LENGTH) {
    throw badRequest(`${label} tối đa ${WEB_LINK_MAX_LENGTH} ký tự.`);
  }

  // Có phần "giao thức:" ở đầu (javascript:, data:, ftp:, http:...)
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(link);
  if (!scheme) {
    throw badRequest(`${label} cần có http:// hoặc https:// ở đầu, ví dụ ${example}.`);
  }
  const protocol = scheme[1].toLowerCase();
  if (protocol !== 'http' && protocol !== 'https') {
    throw badRequest(`${label} chỉ nhận địa chỉ web bắt đầu bằng http:// hoặc https://.`);
  }

  // http(s) nhưng thiếu tên miền, có khoảng trắng hoặc không đọc được thành URL
  let parsed = null;
  try {
    parsed = new URL(link);
  } catch {
    parsed = null;
  }
  if (!parsed || !parsed.hostname || /\s/.test(link) || !/^https?:\/\/[^/?#\s]/i.test(link)) {
    throw badRequest(`${label} không phải địa chỉ web hợp lệ. Ví dụ: ${example}.`);
  }
  return link;
}

module.exports = { parseWebLink, WEB_LINK_MAX_LENGTH };
