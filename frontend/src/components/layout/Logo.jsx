import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { APP_NAME } from '../../utils/appConfig'
import { ROLES } from '../../utils/roles'
import styles from './Logo.module.css'

// Chữ cái đầu của tên hệ thống, giữ nguyên dấu (chuẩn hóa NFC để dấu dính liền chữ)
const MARK = (Array.from(APP_NAME.normalize('NFC'))[0] || '').toLocaleUpperCase('vi')

// HR, Admin về trang Tổng quan của role; khách và ứng viên về bảng tin việc làm
const HOME_BY_ROLE = {
  [ROLES.RECRUITER]: '/recruiter/dashboard',
  [ROLES.ADMIN]: '/admin/dashboard',
}

// Logo dùng chung cho SiteLayout, Header của MainLayout và trang đăng nhập:
// ô vuông Xanh mực chứa chữ cái đầu + tên hệ thống, cả khối là link về trang chủ của người đang xem.
// Màn hình hẹp chỉ còn ô chữ, tên vẫn nằm trong aria-label
function Logo() {
  const { isAuthenticated, role } = useAuth()
  const to = (isAuthenticated && HOME_BY_ROLE[role]) || '/'

  return (
    <Link className={styles.logo} to={to} aria-label={`${APP_NAME} - Trang chủ`}>
      <span className={styles.mark} aria-hidden="true">
        {MARK}
      </span>
      <span className={styles.name}>{APP_NAME}</span>
    </Link>
  )
}

export default Logo
