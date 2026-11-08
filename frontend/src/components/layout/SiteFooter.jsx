import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { usePublicCompany } from '../../hooks/usePublicCompany'
import { APP_NAME, CONTACT_EMAIL, CONTACT_PHONE, FACEBOOK_URL, YOUTUBE_URL } from '../../utils/appConfig'
import { ROLES } from '../../utils/roles'
import { LocationIcon, MailIcon, PhoneIcon } from './FooterIcons'
import Logo from './Logo'
import styles from './SiteFooter.module.css'

// Chỉ biến thành link khi bắt đầu bằng http(s), tránh link lạ như "javascript:" hay đường dẫn tương đối
// khi người cấu hình quên "https://" (cùng quy tắc với trang Giới thiệu)
function isWebLink(value) {
  return /^https?:\/\//i.test(value)
}

// tel: chỉ nhận chữ số và dấu +, bỏ khoảng trắng, dấu chấm hay gạch ngang trong số hiển thị (giống trang Liên hệ)
function toTelHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

const MAIN_LINKS = [
  { to: '/', label: 'Việc làm' },
  { to: '/about', label: 'Giới thiệu' },
  { to: '/contact', label: 'Liên hệ' },
]

// Link mở tab mới: báo trước cho trình đọc màn hình
function NewTabHint() {
  return <span className={styles.srOnly}>, mở trong tab mới</span>
}

// Footer của SiteLayout (khách và ứng viên, T35e). HR / Admin dùng MainLayout nên không có footer.
// Dữ liệu công ty lấy từ GET /company/public (dùng chung với trang Giới thiệu); lỗi thì dùng tên hệ thống,
// dòng nào thiếu dữ liệu thì ẩn
function SiteFooter() {
  const { isAuthenticated, role } = useAuth()
  const company = usePublicCompany()
  const isCandidate = isAuthenticated && role === ROLES.CANDIDATE

  const companyName = (company && company.name) || APP_NAME
  const address = ((company && company.address) || '').trim()
  const website = ((company && company.website) || '').trim()
  const socialLinks = [
    { href: FACEBOOK_URL, label: 'Facebook' },
    { href: YOUTUBE_URL, label: 'YouTube' },
  ].filter((item) => isWebLink(item.href))
  const footerLinks = [
    ...MAIN_LINKS,
    isCandidate ? { to: '/candidate/cvs', label: 'CV của tôi' } : { to: '/register', label: 'Đăng ký tài khoản' },
  ]

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.columns}>
          <div className={styles.info}>
            <Logo />
            <p className={styles.companyName}>{companyName}</p>

            {/* Thông tin liên hệ của công ty. Icon chỉ trang trí, nhãn đọc cho trình đọc màn hình nằm trong srOnly */}
            <address className={styles.contact}>
              {address && (
                <p className={styles.row}>
                  <LocationIcon />
                  <span>
                    <span className={styles.srOnly}>Địa chỉ: </span>
                    {address}
                  </span>
                </p>
              )}
              {CONTACT_PHONE && (
                <p className={styles.row}>
                  <PhoneIcon />
                  <a className={styles.link} href={toTelHref(CONTACT_PHONE)}>
                    <span className={styles.srOnly}>Điện thoại: </span>
                    {CONTACT_PHONE}
                  </a>
                </p>
              )}
              {CONTACT_EMAIL && (
                <p className={styles.row}>
                  <MailIcon />
                  <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`}>
                    <span className={styles.srOnly}>Email: </span>
                    {CONTACT_EMAIL}
                  </a>
                </p>
              )}
              {website && (
                <p className={`${styles.row} ${styles.rowNoIcon}`}>
                  {isWebLink(website) ? (
                    <a className={styles.link} href={website} target="_blank" rel="noopener noreferrer">
                      <span className={styles.srOnly}>Website: </span>
                      {website}
                      <NewTabHint />
                    </a>
                  ) : (
                    website
                  )}
                </p>
              )}
            </address>

            {socialLinks.length > 0 && (
              <p className={styles.social}>
                <span className={styles.socialLabel}>Theo dõi</span>
                {socialLinks.map((item) => (
                  <a key={item.label} className={styles.link} href={item.href} target="_blank" rel="noopener noreferrer">
                    {item.label}
                    <NewTabHint />
                  </a>
                ))}
              </p>
            )}
          </div>

          <nav className={styles.nav} aria-label="Liên kết chân trang">
            <ul className={styles.navList}>
              {footerLinks.map((item) => (
                <li key={item.to}>
                  <Link className={styles.navLink} to={item.to}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Thanh dưới: chữ nhỏ viết hoa màu Chì; dấu "|" chỉ trang trí, ẩn khi xếp dọc trên màn hình hẹp */}
        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} {companyName}
          </p>
          <span className={styles.separator} aria-hidden="true">
            |
          </span>
          <Link className={styles.bottomLink} to="/privacy">
            Chính sách bảo mật
          </Link>
          <span className={styles.separator} aria-hidden="true">
            |
          </span>
          <Link className={styles.bottomLink} to="/terms">
            Điều khoản sử dụng
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
