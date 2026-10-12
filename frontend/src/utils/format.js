// Ngày giờ kiểu Việt Nam: 10/10/2026 21:09. Không có giá trị thì trả chuỗi rỗng.
// Ghép ngày và giờ riêng vì toLocaleString('vi-VN') đặt giờ trước ngày (21:09 10/10/2026)
export function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const day = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return `${day} ${time}`
}

// Mốc thời gian kinh nghiệm / học vấn được lưu là ngày 1 của tháng lúc 00:00 UTC,
// nên đọc theo UTC để không bị lệch tháng theo múi giờ

// "2020-03-01T00:00:00.000Z" -> "03/2020"
export function formatMonthYear(value) {
  if (!value) return ''
  const date = new Date(value)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${month}/${date.getUTCFullYear()}`
}

// "2020-03-01T00:00:00.000Z" -> "2020-03", giá trị cho ô <input type="month">
export function toMonthInput(value) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 7)
}

// Số kiểu Việt Nam, tối đa 1 chữ số thập phân: 33.3 -> "33,3", 70 -> "70"
export function formatNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })
}

// Chỉ ngày: "2026-10-12T13:46:00.000Z" -> "12/10/2026"
export function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
