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
}

// status quyết định màu; chữ hiển thị là children (vd "Có bằng chứng"), không truyền thì hiện chính status.
// Status không có trong bảng trên (APPLIED, UPLOADED...) dùng màu xám.
function Badge({ status, children }) {
  const tone = STATUS_TONE[status] || 'neutral'

  return <span className={`${styles.badge} ${styles[tone]}`}>{children ?? status}</span>
}

export default Badge
