import { Link, Outlet, useLocation } from 'react-router-dom'
import { APP_NAME } from '../../utils/appConfig'
import styles from './PublicLayout.module.css'

// Khung cho trang công khai (bảng tin "/" và chi tiết "/jobs/:id") khi CHƯA đăng nhập:
// header gọn gồm tên hệ thống, Đăng nhập, Đăng ký; không có Sidebar.
// Đã đăng nhập thì AppRouter dùng MainLayout thay cho khung này.
function PublicLayout() {
  const location = useLocation()

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link className={styles.appName} to="/">
          {APP_NAME}
        </Link>
        <nav className={styles.actions} aria-label="Tài khoản">
          {/* Gửi kèm trang đang xem để đăng nhập xong quay lại đúng chỗ */}
          <Link className={styles.secondary} to="/login" state={{ from: location.pathname }}>
            Đăng nhập
          </Link>
          <Link className={styles.primary} to="/register" state={{ from: location.pathname }}>
            Đăng ký
          </Link>
        </nav>
      </header>
      <main className={styles.content}>
        <div className={styles.inner}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default PublicLayout
