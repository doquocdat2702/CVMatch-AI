import styles from './Loading.module.css'

// Vòng xoay kèm chữ, role="status" để trình đọc màn hình báo đang tải
function Loading({ text = 'Đang tải...' }) {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{text}</span>
    </div>
  )
}

export default Loading
