import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../utils/roles'
import styles from './Sidebar.module.css'

// Menu theo role, đường dẫn theo docs/design.md.
// match (tùy chọn): mục được coi là đang chọn ở những đường dẫn nào, dùng khi khác với "to"
const MENU_BY_ROLE = {
  [ROLES.CANDIDATE]: [
    // Danh sách việc làm là trang chung "/" (T31), không có /candidate/jobs.
    // Sáng ở "/" và ở chi tiết công việc /jobs/:id
    { to: '/', label: 'Việc làm', match: (pathname) => pathname === '/' || pathname.startsWith('/jobs/') },
    { to: '/candidate/recommended-jobs', label: 'Việc làm gợi ý' },
    { to: '/candidate/cvs', label: 'CV của tôi' },
    { to: '/candidate/profile', label: 'Hồ sơ' },
    { to: '/candidate/applications', label: 'Đơn ứng tuyển' },
  ],
  [ROLES.RECRUITER]: [
    { to: '/recruiter/profile', label: 'Hồ sơ' },
    { to: '/recruiter/company', label: 'Công ty' },
    { to: '/recruiter/jobs', label: 'Tin tuyển dụng' },
    { to: '/recruiter/applications', label: 'Đơn ứng tuyển' },
  ],
  [ROLES.ADMIN]: [
    { to: '/admin/users', label: 'Tài khoản' },
    { to: '/admin/recruiters/new', label: 'Tạo Recruiter' },
    { to: '/admin/roles', label: 'Phân quyền' },
  ],
}

function Sidebar() {
  const { role } = useAuth()
  const { pathname } = useLocation()
  const items = MENU_BY_ROLE[role] || []

  return (
    <nav className={styles.sidebar} aria-label="Menu chính">
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.to}>
            {item.match ? (
              // Tự tính mục đang chọn theo match và tự gắn aria-current, vì NavLink chỉ sáng
              // khi đường dẫn khớp đúng "to" (không sáng được ở /jobs/:id)
              <Link
                to={item.to}
                className={item.match(pathname) ? `${styles.link} ${styles.active}` : styles.link}
                aria-current={item.match(pathname) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ) : (
              // NavLink tự biết mục nào đang chọn (isActive) và gắn aria-current="page"
              <NavLink
                to={item.to}
                className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
              >
                {item.label}
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Sidebar
