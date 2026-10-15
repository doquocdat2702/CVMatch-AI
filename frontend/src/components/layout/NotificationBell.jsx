import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApplicationDetail } from '../../api/application.api'
import { getNotifications, getUnreadCount, markAllAsRead, markAsRead } from '../../api/notification.api'
import { getErrorMessage } from '../../utils/apiError'
import { formatRelativeTime } from '../../utils/format'
import { ROLES } from '../../utils/roles'
import Button from '../common/Button'
import Loading from '../common/Loading'
import styles from './NotificationBell.module.css'

// Hỏi lại số chưa đọc mỗi 30 giây (không dùng socket)
const POLL_INTERVAL_MS = 30000
// Dropdown chỉ hiện 10 thông báo mới nhất, không có trang danh sách riêng
const LIST_LIMIT = 10

// Trùng NOTIFICATION_TYPES ở backend (notification.service.js)
const NOTIFICATION_TYPES = {
  NEW_APPLICATION: 'NEW_APPLICATION',
  APPLICATION_STATUS_CHANGED: 'APPLICATION_STATUS_CHANGED',
}

const EMPTY_LIST = { loading: false, items: [], total: 0, error: '' }

function countText(count) {
  return count > 9 ? '9+' : String(count)
}

// Trang cần mở khi bấm một thông báo, null nếu không có trang phù hợp
async function resolveTarget(notification, role) {
  if (notification.type === NOTIFICATION_TYPES.APPLICATION_STATUS_CHANGED && role === ROLES.CANDIDATE) {
    return '/candidate/applications'
  }
  if (notification.type === NOTIFICATION_TYPES.NEW_APPLICATION && role === ROLES.RECRUITER) {
    // Thông báo chỉ lưu applicationId, không lưu tin: hỏi chi tiết đơn (API có sẵn) để biết đơn thuộc tin nào.
    // Đơn đã bị ứng viên rút (applicationId = null) hoặc không đọc được thì mở trang Đơn ứng tuyển chung
    if (notification.applicationId) {
      try {
        const result = await getApplicationDetail(notification.applicationId)
        return `/recruiter/applications?jobId=${result.data.job.id}`
      } catch {
        // Rơi xuống trang chung bên dưới
      }
    }
    return '/recruiter/applications'
  }
  return null
}

// Chuông thông báo trên Header cho ứng viên và nhà tuyển dụng (admin không có thông báo).
// role: role của người đang đăng nhập, quyết định thông báo dẫn tới trang nào
function NotificationBell({ role }) {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const panelId = useId()
  const titleId = useId()

  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  // Danh sách trong dropdown, tải lại mỗi lần mở để luôn mới
  const [list, setList] = useState(EMPTY_LIST)
  // Đang đánh dấu đã đọc hoặc đang tìm trang để chuyển: khóa các nút trong dropdown
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  // Số chưa đọc: gọi ngay khi mở app rồi lặp lại mỗi 30 giây; dọn interval khi component unmount
  // (đăng xuất, chuyển sang trang không có Header)
  useEffect(() => {
    let ignore = false
    function loadCount() {
      getUnreadCount()
        .then((result) => {
          if (!ignore) setUnreadCount(result.data.count)
        })
        .catch(() => {
          // Lỗi mạng thì giữ số cũ, lần hỏi sau sẽ cập nhật
        })
    }
    loadCount()
    const timer = setInterval(loadCount, POLL_INTERVAL_MS)
    return () => {
      ignore = true
      clearInterval(timer)
    }
  }, [])

  // Dropdown đang mở: bấm ra ngoài thì đóng, Esc thì đóng và trả focus về nút chuông
  useEffect(() => {
    if (!open) return undefined

    function handleMouseDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
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

  async function refreshCount() {
    try {
      const result = await getUnreadCount()
      setUnreadCount(result.data.count)
    } catch {
      // Giữ số cũ
    }
  }

  async function loadList() {
    setList({ ...EMPTY_LIST, loading: true })
    try {
      const result = await getNotifications({ page: 1, limit: LIST_LIMIT })
      setList({ loading: false, items: result.data.items, total: result.data.pagination.total, error: '' })
    } catch (err) {
      setList({ ...EMPTY_LIST, error: getErrorMessage(err, 'Không tải được thông báo') })
    }
  }

  function handleToggle() {
    if (open) {
      setOpen(false)
      return
    }
    setActionError('')
    setOpen(true)
    loadList()
    // Mở dropdown thì cập nhật luôn số trên chuông, không chờ tới lượt hỏi 30 giây
    refreshCount()
  }

  // Bấm một thông báo: đánh dấu đã đọc rồi chuyển tới trang liên quan
  async function handleSelect(notification) {
    setBusy(true)
    setActionError('')
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id)
        setList((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
        }))
        setUnreadCount((count) => Math.max(0, count - 1))
      } catch {
        // Đánh dấu lỗi vẫn chuyển trang; thông báo vẫn là chưa đọc, lần sau bấm lại
      }
    }
    const target = await resolveTarget(notification, role)
    setBusy(false)
    if (target) {
      setOpen(false)
      navigate(target)
    }
  }

  async function handleMarkAll() {
    setBusy(true)
    setActionError('')
    try {
      // Đánh dấu mọi thông báo chưa đọc, kể cả những cái không nằm trong 10 cái đang hiện
      await markAllAsRead()
      setList((prev) => ({ ...prev, items: prev.items.map((item) => ({ ...item, isRead: true })) }))
      setUnreadCount(0)
    } catch (err) {
      setActionError(getErrorMessage(err, 'Không đánh dấu được, vui lòng thử lại'))
    } finally {
      setBusy(false)
    }
  }

  const hasUnread = unreadCount > 0 || list.items.some((item) => !item.isRead)

  let body
  if (list.loading) {
    body = (
      <div className={styles.state}>
        <Loading text="Đang tải thông báo..." />
      </div>
    )
  } else if (list.error) {
    body = (
      <div className={styles.state}>
        <p className={styles.errorText} role="alert">
          {list.error}
        </p>
        <Button variant="secondary" size="sm" onClick={loadList}>
          Thử lại
        </Button>
      </div>
    )
  } else if (list.items.length === 0) {
    body = <p className={styles.empty}>Chưa có thông báo</p>
  } else {
    body = (
      <>
        <ul className={styles.list}>
          {list.items.map((notification) => (
            <li key={notification.id}>
              {/* Chưa đọc: nền Xanh nhạt và chữ đậm (nhận ra được mà không cần phân biệt màu) */}
              <button
                type="button"
                className={notification.isRead ? styles.item : `${styles.item} ${styles.unread}`}
                onClick={() => handleSelect(notification)}
                disabled={busy}
              >
                {!notification.isRead && <span className={styles.srOnly}>Chưa đọc: </span>}
                <span className={styles.message}>{notification.message}</span>
                <span className={styles.time}>{formatRelativeTime(notification.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
        {list.total > LIST_LIMIT && <p className={styles.footer}>Đang hiện {LIST_LIMIT} thông báo mới nhất.</p>}
      </>
    )
  }

  return (
    <div className={styles.bell} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={handleToggle}
      >
        {/* Chuông vẽ bằng SVG ngay trong code, không dùng thư viện icon */}
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
        {/* Ẩn khi không có thông báo chưa đọc; số đã nằm trong aria-label của nút */}
        {unreadCount > 0 && (
          <span className={styles.count} aria-hidden="true">
            {countText(unreadCount)}
          </span>
        )}
      </button>

      {open && (
        <div id={panelId} className={styles.panel} role="region" aria-labelledby={titleId}>
          <div className={styles.panelHeader}>
            <p id={titleId} className={styles.title}>
              Thông báo
            </p>
            <Button variant="ghost" size="sm" onClick={handleMarkAll} disabled={!hasUnread || busy || list.loading}>
              Đánh dấu tất cả đã đọc
            </Button>
          </div>
          {actionError && (
            <p className={`${styles.errorText} ${styles.actionError}`} role="alert">
              {actionError}
            </p>
          )}
          {body}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
