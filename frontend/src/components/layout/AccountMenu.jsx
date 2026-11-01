import { startTransition, useEffect, useId, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getMyProfile } from '../../api/candidate.api'
import { useAuth } from '../../hooks/useAuth'
import styles from './AccountMenu.module.css'

// Các trang của ứng viên, không còn nằm trên menu chính (T35d)
const ACCOUNT_ITEMS = [
  { to: '/candidate/profile', label: 'Hồ sơ' },
  { to: '/candidate/cvs', label: 'CV của tôi' },
  { to: '/candidate/applications', label: 'Đơn ứng tuyển' },
  { to: '/candidate/change-password', label: 'Đổi mật khẩu' },
]

// Tên tiếng Việt gọi bằng chữ cuối ("Nguyễn Văn An" -> "An").
// Chưa có họ tên (hồ sơ chưa tải xong hoặc tải lỗi) thì dùng phần trước @ của email
function getShortName(fullName, email) {
  const words = fullName.split(/\s+/).filter(Boolean)
  return words.length > 0 ? words[words.length - 1] : email.split('@')[0]
}

// Chữ cái đầu, giữ nguyên dấu ("Ánh" -> "Á"): chuẩn hóa NFC để dấu dính liền chữ, không bị tách ra
function getInitial(name) {
  const first = Array.from(name.normalize('NFC'))[0] || ''
  return first.toLocaleUpperCase('vi')
}

// Nút tài khoản trên SiteLayout, chỉ dành cho ứng viên: chữ cái đầu + tên rút gọn, bấm mở menu
// gồm Hồ sơ, CV của tôi, Đơn ứng tuyển, Đổi mật khẩu, Đăng xuất
function AccountMenu() {
  const { user, logout, profileName: fullName, setProfileName } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const menuId = useId()

  // Menu chỉ mở trong đúng lượt điều hướng đã bấm mở: đổi route thì location.key đổi nên menu tự đóng
  const [openKey, setOpenKey] = useState(null)
  const open = openKey === location.key

  // Họ tên nằm trong hồ sơ ứng viên, không có trong phiên đăng nhập (chỉ có id, email, role).
  // Giữ ở AuthContext để trang Hồ sơ đổi được ngay sau khi lưu; đã có thì không tải lại mỗi lần đổi layout
  useEffect(() => {
    if (fullName) return undefined
    let ignore = false
    getMyProfile()
      .then((result) => {
        if (!ignore) setProfileName((result.data.fullName || '').trim())
      })
      .catch(() => {
        // Không tải được hồ sơ thì nút hiện theo email
      })
    return () => {
      ignore = true
    }
  }, [fullName, setProfileName])

  // Menu đang mở: bấm ra ngoài thì đóng, Esc thì đóng và trả focus về nút
  useEffect(() => {
    if (!open) return undefined

    function handleMouseDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenKey(null)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpenKey(null)
        if (triggerRef.current) triggerRef.current.focus()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function menuItems() {
    return listRef.current ? Array.from(listRef.current.querySelectorAll('[role="menuitem"]')) : []
  }

  function handleToggle() {
    setOpenKey(open ? null : location.key)
  }

  // Mũi tên xuống trên nút: mở menu và đưa focus vào mục đầu (Tab vẫn đi lần lượt như thường)
  function handleTriggerKeyDown(event) {
    if (event.key !== 'ArrowDown') return
    event.preventDefault()
    setOpenKey(location.key)
    requestAnimationFrame(() => {
      const items = menuItems()
      if (items.length > 0) items[0].focus()
    })
  }

  // Trong menu: mũi tên lên / xuống đi vòng giữa các mục, Home / End về mục đầu / cuối
  function handleMenuKeyDown(event) {
    const items = menuItems()
    const index = items.indexOf(document.activeElement)
    let next = -1
    if (event.key === 'ArrowDown') next = (index + 1) % items.length
    else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    if (next < 0) return
    event.preventDefault()
    items[next].focus()
  }

  // Tab ra khỏi menu (focus sang phần tử ngoài khung) thì đóng.
  // relatedTarget null là bấm vào chỗ không nhận focus: bấm trong khung thì giữ, bấm ngoài đã có mousedown lo
  function handleBlur(event) {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
      setOpenKey(null)
    }
  }

  // Đăng xuất về trang chủ "/" (bố cục khách), không mang theo trang cũ. Xóa phiên và đổi route trong cùng
  // một transition (BrowserRouter đổi route trong startTransition): nếu xóa phiên render trước,
  // ProtectedRoute của trang ứng viên đang đứng sẽ đẩy sang /login
  function handleLogout() {
    setOpenKey(null)
    startTransition(() => {
      logout()
      navigate('/', { replace: true })
    })
  }

  const shortName = getShortName(fullName, user.email)
  const itemClass = ({ isActive }) => (isActive ? `${styles.item} ${styles.active}` : styles.item)

  return (
    <div className={styles.account} ref={containerRef} onBlur={handleBlur}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        // Tên đầy đủ cho trình đọc màn hình, vẫn chứa đúng chữ đang hiện trên nút
        aria-label={`Tài khoản ${fullName || shortName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={styles.avatar} aria-hidden="true">
          {getInitial(shortName)}
        </span>
        <span className={styles.name} aria-hidden="true">
          {shortName}
        </span>
        {/* Dấu ▾ vẽ bằng CSS (tam giác viền), không dùng thư viện icon */}
        <span className={styles.caret} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.identity}>
            {fullName && <p className={styles.fullName}>{fullName}</p>}
            <p className={styles.email}>{user.email}</p>
          </div>
          <ul id={menuId} ref={listRef} className={styles.list} role="menu" aria-label="Tài khoản" onKeyDown={handleMenuKeyDown}>
            {ACCOUNT_ITEMS.map((item) => (
              <li key={item.to} role="none">
                {/* NavLink tự gắn aria-current="page" cho trang đang mở */}
                <NavLink role="menuitem" to={item.to} className={itemClass} onClick={() => setOpenKey(null)}>
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li role="separator" className={styles.separator} />
            <li role="none">
              <button type="button" role="menuitem" className={styles.item} onClick={handleLogout}>
                Đăng xuất
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default AccountMenu
