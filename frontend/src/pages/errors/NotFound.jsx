import { Link } from 'react-router-dom'
import styles from '../auth/Auth.module.css'

function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>404 - Không tìm thấy trang</h1>
        <p className={styles.subtitle}>Đường dẫn không tồn tại hoặc đã bị thay đổi.</p>
        <div className={styles.actions}>
          <Link className={styles.button} to="/">
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  )
}

export default NotFound
