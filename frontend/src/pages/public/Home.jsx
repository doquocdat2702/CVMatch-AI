import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABEL, getRoleHome } from '../../utils/roles'
import styles from '../auth/Auth.module.css'

// Trang chủ công khai, bản tạm. T31 thay bằng danh sách việc làm công khai.
function Home() {
  // Dùng luôn phiên đã lưu trong lúc getMe đang chạy để nút không bị nhấp nháy
  const { isAuthenticated, role, user } = useAuth()

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>CV Matching System</h1>
        <p className={styles.subtitle}>
          Phân tích CV và đối chiếu với yêu cầu của từng vị trí tuyển dụng, giúp kết nối ứng viên với công việc phù
          hợp.
        </p>

        {isAuthenticated ? (
          <>
            <p className={styles.muted}>Bạn đang đăng nhập bằng {user.email}.</p>
            <div className={styles.actions}>
              <Link className={styles.button} to={getRoleHome(role)}>
                Vào trang {(ROLE_LABEL[role] || '').toLowerCase()}
              </Link>
            </div>
          </>
        ) : (
          <div className={styles.actions}>
            <Link className={styles.button} to="/login">
              Đăng nhập
            </Link>
            <Link className={`${styles.button} ${styles.buttonSecondary}`} to="/register">
              Đăng ký
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

export default Home
