import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../utils/roles'
import styles from './Sidebar.module.css'

// Menu theo role, đường dẫn theo docs/design.md.
// Từ T35d Sidebar chỉ phục vụ nhà tuyển dụng và quản trị viên; ứng viên dùng SiteLayout (menu ngang + AccountMenu)
// T35i: Hồ sơ, Công ty, Đổi mật khẩu gộp vào một mục "Tài khoản" (khu Tài khoản có menu con riêng);
// admin bỏ mục "Tạo nhà tuyển dụng" (mở từ nút trên trang Tài khoản người dùng).
// matches: các đường dẫn khác cũng làm mục này sáng (trang con nằm ngoài đường dẫn của mục)
const MENU_BY_ROLE = {
  [ROLES.RECRUITER]: [
    { to: '/recruiter/dashboard', label: 'Tổng quan' },
    { to: '/recruiter/jobs', label: 'Tin tuyển dụng' },
    { to: '/recruiter/recommended-candidates', label: 'Ứng viên gợi ý' },
    { to: '/recruiter/applications', label: 'Đơn ứng tuyển' },
    {
      to: '/recruiter/profile',
      label: 'Tài khoản',
      matches: ['/recruiter/company', '/recruiter/change-password'],
    },
  ],
  [ROLES.ADMIN]: [
    { to: '/admin/dashboard', label: 'Tổng quan' },
    { to: '/admin/users', label: 'Tài khoản người dùng', matches: ['/admin/recruiters'] },
    { to: '/admin/roles', label: 'Phân quyền' },
    { to: '/admin/profile', label: 'Tài khoản', matches: ['/admin/change-password'] },
  ],
}

// Cùng cách so khớp với NavLink (không "end"): đúng đường dẫn hoặc trang con của nó
function isUnder(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`)
}

function Sidebar() {
  const { role } = useAuth()
  const { pathname } = useLocation()
  const items = MENU_BY_ROLE[role] || []

  return (
    <nav className={styles.sidebar} aria-label="Menu chính">
      <ul className={styles.list}>
        {items.map((item) => {
          // NavLink chỉ biết một đường dẫn nên tự tính trạng thái đang chọn, gắn aria-current như NavLink
          const active = [item.to, ...(item.matches || [])].some((path) => isUnder(pathname, path))
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={active ? `${styles.link} ${styles.active}` : styles.link}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default Sidebar
