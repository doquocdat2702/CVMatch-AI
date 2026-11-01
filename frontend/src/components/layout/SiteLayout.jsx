import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../utils/roles'
import AccountMenu from './AccountMenu'
import Logo from './Logo'
import NotificationBell from './NotificationBell'
import SiteFooter from './SiteFooter'
import styles from './SiteLayout.module.css'

// Menu chính của khách và ứng viên (T35d). Trang riêng của ứng viên nằm trong AccountMenu
const NAV_ITEMS = [
  { to: '/', label: 'Việc làm' },
  { to: '/about', label: 'Giới thiệu' },
  { to: '/contact', label: 'Liên hệ' },
]

// NavLink "/" chỉ sáng ở đúng "/", nhưng chi tiết một tin và chi tiết đối chiếu (tab Gợi ý)
// vẫn thuộc mục "Việc làm" nên vẫn gạch chân mục này (aria-current chỉ gắn ở đúng trang danh sách)
function isJobsSection(pathname) {
  return pathname.startsWith('/jobs/') || pathname.startsWith('/candidate/recommended-jobs/')
}

// Khung kiểu trang tuyển dụng cho khách và ứng viên: menu ngang trên cùng, không Sidebar,
// nội dung căn giữa. Dưới 900px header thành 2 hàng (Logo + tài khoản, rồi menu chính).
// HR và Admin vẫn dùng MainLayout (Header + Sidebar)
function SiteLayout() {
  const { user, role, isAuthenticated } = useAuth()
  const location = useLocation()
  const isCandidate = isAuthenticated && role === ROLES.CANDIDATE

  function navLinkClass(isActive) {
    return isActive ? `${styles.navLink} ${styles.navActive}` : styles.navLink
  }

  // Gửi kèm trang đang xem để đăng nhập / đăng ký xong quay lại đúng chỗ
  const returnState = { from: `${location.pathname}${location.search}` }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.bar}>
          <div className={styles.brand}>
            <Logo />
          </div>

          <nav className={styles.nav} aria-label="Menu chính">
            <ul className={styles.navList}>
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  {/* NavLink tự gắn aria-current="page" ở trang đang mở */}
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      navLinkClass(isActive || (item.to === '/' && isJobsSection(location.pathname)))
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            {isCandidate ? (
              <>
                {/* key theo tài khoản: đổi tài khoản thì chuông và menu tài khoản bắt đầu lại từ đầu */}
                <NotificationBell key={`bell-${user.id}`} role={role} />
                <AccountMenu key={`account-${user.id}`} />
              </>
            ) : (
              <>
                <Link className={styles.loginLink} to="/login" state={returnState}>
                  Đăng nhập
                </Link>
                <Link className={styles.registerButton} to="/register" state={returnState}>
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* flex: 1 trong khung cột cao tối thiểu 100vh: trang ít nội dung thì footer vẫn sát đáy màn hình */}
      <main className={styles.content}>
        <div className={styles.inner}>
          <Outlet />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

export default SiteLayout
