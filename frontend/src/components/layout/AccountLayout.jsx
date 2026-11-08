import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { getMyProfile } from '../../api/candidate.api'
import { useAuth } from '../../hooks/useAuth'
import styles from './AccountLayout.module.css'

// Menu của khu Tài khoản, cùng các mục với AccountMenu trên header
const ACCOUNT_ITEMS = [
  { to: '/candidate/profile', label: 'Hồ sơ' },
  { to: '/candidate/cvs', label: 'CV của tôi' },
  { to: '/candidate/applications', label: 'Đơn ứng tuyển' },
  { to: '/candidate/change-password', label: 'Đổi mật khẩu' },
]

// Các mục hồ sơ đếm cho "Hồ sơ đã có x/y mục": 4 trường ứng viên tự nhập + 3 nhóm dữ liệu từ CV
const PROFILE_PARTS = [
  (profile) => profile.fullName,
  (profile) => profile.phone,
  (profile) => profile.address,
  (profile) => profile.headline,
  (profile) => profile.skills && profile.skills.length > 0,
  (profile) => profile.experiences && profile.experiences.length > 0,
  (profile) => profile.educations && profile.educations.length > 0,
]

function countFilledParts(profile) {
  return PROFILE_PARTS.filter((isFilled) => {
    const value = isFilled(profile)
    return typeof value === 'string' ? value.trim() !== '' : Boolean(value)
  }).length
}

// Chữ viết tắt họ tên: chữ đầu của từ đầu + từ cuối ("Nguyễn Thị Ánh" -> "NÁ"), giữ dấu.
// Chưa có họ tên thì lấy chữ đầu của email
function getInitials(fullName, email) {
  const words = fullName.normalize('NFC').split(/\s+/).filter(Boolean)
  const first = (word) => (Array.from(word)[0] || '').toLocaleUpperCase('vi')
  if (words.length === 0) return first(email)
  if (words.length === 1) return first(words[0])
  return first(words[0]) + first(words[words.length - 1])
}

// Khu "Tài khoản của tôi" của ứng viên (T35g): Hồ sơ, CV của tôi, Đơn ứng tuyển, Đổi mật khẩu.
// Cột trái: khung tóm tắt (chữ viết tắt, họ tên, email, mức đầy đủ của hồ sơ) + menu; cột phải: nội dung trang.
// API không trả ngày tạo tài khoản cho ứng viên nên không có dòng "Tham gia".
// Dưới 900px: khung tóm tắt thu gọn một dòng, menu thành hàng tab cuộn ngang.
// Trang con gọi refreshProfile (qua useOutletContext) sau khi đổi dữ liệu hồ sơ để khung tóm tắt đếm lại
function AccountLayout() {
  const { user, profileName } = useAuth()
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const navRef = useRef(null)

  // Dưới 900px menu là hàng tab cuộn ngang: cuộn tới mục đang mở để mục cuối (Đổi mật khẩu) không bị cắt.
  // Chạy lại mỗi khi hàng tab đổi kích thước: font tự host tải xong thì chữ rộng ra, xoay màn hình thì khung đổi.
  // Trên máy tính menu không cuộn (vừa khung) nên không làm gì
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return undefined
    function scrollToActive() {
      const active = nav.querySelector('[aria-current="page"]')
      if (!active || nav.scrollWidth <= nav.clientWidth) return
      nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2
    }
    scrollToActive()
    // Theo dõi từng link (rộng ra khi font đổi); danh sách ul luôn rộng bằng khung nên không báo khi chữ rộng ra
    const observer = new ResizeObserver(scrollToActive)
    nav.querySelectorAll('a').forEach((link) => observer.observe(link))
    observer.observe(nav)
    return () => observer.disconnect()
  }, [location.pathname])

  // Tải lại khi đổi trang trong khu (vd vừa phân tích CV xong rồi sang Hồ sơ) hoặc khi trang con báo
  useEffect(() => {
    let ignore = false
    getMyProfile()
      .then((result) => {
        if (!ignore) setProfile(result.data)
      })
      .catch(() => {
        // Không tải được thì khung tóm tắt chỉ có tên và email, nội dung trang vẫn dùng được
      })
    return () => {
      ignore = true
    }
  }, [location.pathname, reloadKey])

  const fullName = (profile && profile.fullName) || profileName || ''
  const email = user ? user.email : ''
  const filled = profile ? countFilledParts(profile) : null
  const total = PROFILE_PARTS.length

  return (
    <div className={styles.account}>
      <aside className={styles.side}>
        <section className={styles.summary} aria-label="Tóm tắt tài khoản">
          <span className={styles.mark} aria-hidden="true">
            {getInitials(fullName, email)}
          </span>
          <div className={styles.identity}>
            <p className={styles.name}>{fullName || email}</p>
            <p className={styles.email}>{email}</p>
          </div>
          {filled !== null && (
            <div className={styles.progress}>
              <p className={styles.progressText}>
                Hồ sơ đã có {filled}/{total} mục
              </p>
              {/* Thanh trung tính (như coverage): chỉ là mức đầy đủ của hồ sơ, không phải điểm */}
              <div className={styles.track} aria-hidden="true">
                <div className={styles.fill} style={{ width: `${(filled / total) * 100}%` }} />
              </div>
            </div>
          )}
        </section>

        <nav ref={navRef} className={styles.nav} aria-label="Tài khoản của tôi">
          <ul className={styles.navList}>
            {ACCOUNT_ITEMS.map((item) => (
              <li key={item.to}>
                {/* NavLink tự gắn aria-current="page" ở trang đang mở */}
                <NavLink
                  to={item.to}
                  className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.navActive}` : styles.navLink)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className={styles.main}>
        <Outlet context={{ refreshProfile: () => setReloadKey((key) => key + 1) }} />
      </div>
    </div>
  )
}

export default AccountLayout
