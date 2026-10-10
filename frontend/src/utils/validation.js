// Cùng quy tắc với backend (auth.service.js) để báo lỗi ngay trên form
export const MIN_PASSWORD_LENGTH = 6

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email) {
  return EMAIL_REGEX.test(email)
}
