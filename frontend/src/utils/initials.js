// Chữ viết tắt họ tên: chữ đầu của từ đầu + từ cuối ("Nguyễn Thị Ánh" -> "NÁ"), giữ dấu.
// Chưa có họ tên thì lấy chữ đầu của email. Dùng ở thẻ tóm tắt khu Tài khoản, ảnh đại diện trang Hồ sơ
// và mẫu CV Chuyên nghiệp (T35k: tách từ AccountLayout để dùng chung)
export function getInitials(fullName, email) {
  const words = (fullName || '').normalize('NFC').split(/\s+/).filter(Boolean)
  const first = (word) => (Array.from(word || '')[0] || '').toLocaleUpperCase('vi')
  if (words.length === 0) return first(email)
  if (words.length === 1) return first(words[0])
  return first(words[0]) + first(words[words.length - 1])
}
