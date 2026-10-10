// Ngày giờ kiểu Việt Nam: 10/10/2026 21:09. Không có giá trị thì trả chuỗi rỗng.
// Ghép ngày và giờ riêng vì toLocaleString('vi-VN') đặt giờ trước ngày (21:09 10/10/2026)
export function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const day = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return `${day} ${time}`
}
