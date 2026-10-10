import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getRoleHome } from '../../utils/roles'
import styles from '../auth/Auth.module.css'

// ProtectedRoute chuyển tới đây khi đã đăng nhập nhưng sai role
function Forbidden() {
  const { isAuthenticated, role } = useAuth()

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>403 - Không có quyền truy cập</h1>
        <p className={styles.subtitle}>Tài khoản của bạn không được phép mở trang này.</p>
        <div className={styles.actions}>
          {isAuthenticated ? (
            <Link className={styles.button} to={getRoleHome(role)}>
              Về trang của tôi
            </Link>
          ) : (
            <Link className={styles.button} to="/">
              Về trang chủ
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}

export default Forbidden
