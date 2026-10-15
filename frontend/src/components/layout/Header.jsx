import { useNavigate } from 'react-router-dom'
import Button from '../common/Button'
import { useAuth } from '../../hooks/useAuth'
import { APP_NAME } from '../../utils/appConfig'
import { ROLES } from '../../utils/roles'
import NotificationBell from './NotificationBell'
import styles from './Header.module.css'

// Hệ thống chỉ sinh thông báo cho ứng viên (đơn đổi trạng thái) và nhà tuyển dụng (có đơn mới)
const ROLES_WITH_NOTIFICATIONS = [ROLES.CANDIDATE, ROLES.RECRUITER]

function Header() {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className={styles.header}>
      <span className={styles.appName}>{APP_NAME}</span>
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
