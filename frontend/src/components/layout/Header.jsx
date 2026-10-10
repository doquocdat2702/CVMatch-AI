import { useNavigate } from 'react-router-dom'
import Button from '../common/Button'
import { useAuth } from '../../hooks/useAuth'
import { APP_NAME } from '../../utils/appConfig'
import styles from './Header.module.css'

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className={styles.header}>
      <span className={styles.appName}>{APP_NAME}</span>
      <div className={styles.account}>
        {user && <span className={styles.email}>{user.email}</span>}
        <Button variant="secondary" size="sm" onClick={handleLogout}>
          Đăng xuất
        </Button>
      </div>
    </header>
  )
}

export default Header
