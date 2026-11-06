import styles from './PageHeader.module.css'

// Đầu trang của các trang ứng viên (T35f): h1 serif + một câu mô tả ngắn, nút chính (nếu có) bên phải.
// Dưới 900px nút xuống dưới câu mô tả.
function PageHeader({ title, description, actions }) {
  return (
    <div className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}

export default PageHeader
