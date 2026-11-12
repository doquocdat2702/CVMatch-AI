import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Badge from '../common/Badge'
import styles from './AccountLayout.module.css'

// Chữ viết tắt họ tên: chữ đầu của từ đầu + từ cuối ("Nguyễn Thị Ánh" -> "NÁ"), giữ dấu.
// Chưa có họ tên (hoặc quản trị viên, không có họ tên) thì lấy chữ đầu của email
function getInitials(fullName, email) {
  const words = (fullName || '').normalize('NFC').split(/\s+/).filter(Boolean)
  const first = (word) => (Array.from(word || '')[0] || '').toLocaleUpperCase('vi')
  if (words.length === 0) return first(email)
  if (words.length === 1) return first(words[0])
  return first(words[0]) + first(words[words.length - 1])
}

// Khung "Tài khoản" dùng chung cho 3 role (T35g cho ứng viên, T35i mở rộng cho nhà tuyển dụng và quản trị viên).
// Cột trái: thẻ tóm tắt + menu con; cột phải: nội dung trang (Outlet). Dữ liệu do khung theo role truyền vào
// (components/layout/AccountAreas.jsx), khung này chỉ trình bày:
//   items: [{ to, label }] menu con (NavLink, tự gắn aria-current)
//   navLabel: tên vùng menu cho trình đọc màn hình
//   summary: { fullName, email, badge: { status, label } | null, meta: chuỗi phụ (tên công ty) | null,
//              progress: { filled, total } | null }  — progress null thì không có dòng "Hồ sơ đã có x/y mục"
//   outletContext: truyền cho trang con qua useOutletContext (vd refreshProfile)
// Dưới 900px: thẻ tóm tắt thu gọn một dòng (bỏ email, nhãn vai trò, công ty, thanh), menu thành hàng tab cuộn ngang.
function AccountLayout({ items, navLabel, summary, outletContext }) {
  const location = useLocation()
  const navRef = useRef(null)

  // Dưới 900px menu là hàng tab cuộn ngang: cuộn tới mục đang mở để mục cuối không bị cắt.
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

  const { fullName, email, badge, meta, progress } = summary

  return (
    <div className={styles.account}>
      <aside className={styles.side}>
        <section className={styles.summary} aria-label="Tóm tắt tài khoản">
          <span className={styles.mark} aria-hidden="true">
            {getInitials(fullName, email)}
          </span>
          <div className={styles.identity}>
            <p className={styles.name}>{fullName || email}</p>
            {/* Chưa có họ tên thì dòng trên đã là email, không lặp lại */}
            {fullName && <p className={styles.email}>{email}</p>}
          </div>
          {(badge || meta) && (
            <div className={styles.meta}>
              {badge && <Badge status={badge.status}>{badge.label}</Badge>}
              {meta && <p className={styles.metaText}>{meta}</p>}
            </div>
          )}
          {progress && (
            <div className={styles.progress}>
              <p className={styles.progressText}>
                Hồ sơ đã có {progress.filled}/{progress.total} mục
              </p>
              {/* Thanh trung tính (như coverage): chỉ là mức đầy đủ của hồ sơ, không phải điểm */}
              <div className={styles.track} aria-hidden="true">
                <div className={styles.fill} style={{ width: `${(progress.filled / progress.total) * 100}%` }} />
              </div>
            </div>
          )}
        </section>

        <nav ref={navRef} className={styles.nav} aria-label={navLabel}>
          <ul className={styles.navList}>
            {items.map((item) => (
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
        <Outlet context={outletContext} />
      </div>
    </div>
  )
}

export default AccountLayout
