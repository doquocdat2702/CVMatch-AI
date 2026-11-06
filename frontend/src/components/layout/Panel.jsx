import styles from './Panel.module.css'

// Khối nội dung của trang ứng viên (T35f): nền Giấy, viền mảnh, không đổ bóng, đặt trên nền Nền của SiteLayout.
//   title: tiêu đề mục (h2), không có thì khối chỉ có nội dung
//   width: 'form' giới hạn bề ngang bằng form (trang Hồ sơ, Đổi mật khẩu); mặc định rộng hết vùng nội dung
function Panel({ title, width, children }) {
  const className = width === 'form' ? `${styles.panel} ${styles.form}` : styles.panel
  return (
    <section className={className}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </section>
  )
}

export default Panel
