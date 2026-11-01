import { startTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../common/Button'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../utils/roles'
import Logo from './Logo'
import NotificationBell from './NotificationBell'
import styles from './Header.module.css'

// Hệ thống chỉ sinh thông báo cho ứng viên (đơn đổi trạng thái) và nhà tuyển dụng (có đơn mới)
const ROLES_WITH_NOTIFICATIONS = [ROLES.CANDIDATE, ROLES.RECRUITER]

function Header() {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()

  // Đăng xuất về trang chủ "/" (bố cục khách), không mang theo trang cũ.
  // BrowserRouter đổi route trong startTransition, nên xóa phiên cũng đặt trong transition để hai thay đổi
  // render cùng lúc; nếu xóa phiên render trước, ProtectedRoute của trang đang đứng sẽ đẩy sang /login
  function handleLogout() {
    startTransition(() => {
      logout()
      navigate('/', { replace: true })
    })
  }

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Logo />
      </div>
      <div className={styles.account}>
        {/* Admin không có chuông. key theo tài khoản: đổi tài khoản thì chuông bắt đầu lại từ đầu */}
        {user && ROLES_WITH_NOTIFICATIONS.includes(role) && <NotificationBell key={user.id} role={role} />}
        {user && <span className={styles.email}>{user.email}</span>}
        <Button variant="secondary" size="sm" onClick={handleLogout}>
          Đăng xuất
        </Button>
      </div>
    </header>
  )
}

export default Header
