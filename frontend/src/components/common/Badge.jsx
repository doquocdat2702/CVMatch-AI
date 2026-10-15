import styles from './Badge.module.css'

// Nhóm màu theo status (gộp các enum CvStatus, MatchStatus, ApplicationStatus)
const STATUS_TONE = {
  SUPPORTED: 'success',
  COMPLETED: 'success',
  ACCEPTED: 'success',
  UNCERTAIN: 'warning',
  REVIEWING: 'warning',
  PROCESSING: 'warning',
  NOT_FOUND: 'danger',
  FAILED: 'danger',
  REJECTED: 'danger',
  // Trạng thái tin tuyển dụng (T33): OPEN xanh lá; CLOSED không có trong bảng nên xám
  OPEN: 'success',
  // Trạng thái tài khoản (T35): đang hoạt động xanh lá, đã khóa đỏ
  ACTIVE: 'success',
  LOCKED: 'danger',
}

// status quyết định màu; chữ hiển thị là children (vd "Có bằng chứng"), không truyền thì hiện chính status.
// Status không có trong bảng trên (APPLIED, UPLOADED...) dùng màu xám.
function Badge({ status, children }) {
  const tone = STATUS_TONE[status] || 'neutral'

  return <span className={`${styles.badge} ${styles[tone]}`}>{children ?? status}</span>
}

export default Badge
