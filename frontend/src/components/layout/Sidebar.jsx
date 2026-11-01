import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../utils/roles'
import styles from './Sidebar.module.css'

// Menu theo role, đường dẫn theo docs/design.md.
// Từ T35d Sidebar chỉ phục vụ nhà tuyển dụng và quản trị viên; ứng viên dùng SiteLayout (menu ngang + AccountMenu)
const MENU_BY_ROLE = {
  [ROLES.RECRUITER]: [
    { to: '/recruiter/dashboard', label: 'Tổng quan' },
    { to: '/recruiter/profile', label: 'Hồ sơ' },
    { to: '/recruiter/change-password', label: 'Đổi mật khẩu' },
    { to: '/recruiter/company', label: 'Công ty' },
    { to: '/recruiter/jobs', label: 'Tin tuyển dụng' },
    { to: '/recruiter/recommended-candidates', label: 'Ứng viên gợi ý' },
    { to: '/recruiter/applications', label: 'Đơn ứng tuyển' },
  ],
  [ROLES.ADMIN]: [
    { to: '/admin/dashboard', label: 'Tổng quan' },
    { to: '/admin/users', label: 'Tài khoản' },
    { to: '/admin/recruiters/new', label: 'Tạo Recruiter' },
    { to: '/admin/roles', label: 'Phân quyền' },
    { to: '/admin/profile', label: 'Hồ sơ' },
    { to: '/admin/change-password', label: 'Đổi mật khẩu' },
  ],
}

function Sidebar() {
  const { role } = useAuth()
  const items = MENU_BY_ROLE[role] || []

  return (
    <nav className={styles.sidebar} aria-label="Menu chính">
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.to}>
            {/* NavLink tự biết mục nào đang chọn (isActive) và gắn aria-current="page" */}
            <NavLink
              to={item.to}
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Sidebar
