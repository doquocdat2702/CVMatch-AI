import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Button from './Button'
import styles from './Modal.module.css'

// open: hiện / ẩn. onClose: gọi khi bấm Esc, nút "Đóng" hoặc bấm ra lớp phủ.
// footer: các nút hành động ở chân modal (vd Hủy, Lưu).
function Modal({ open, onClose, title, children, footer }) {
  const titleId = useId()
  const dialogRef = useRef(null)
  // Giữ onClose mới nhất trong ref để effect bên dưới chỉ chạy lại khi open đổi.
  // Nếu đưa onClose vào dependency, mỗi lần trang cha render lại (vd gõ vào ô trong modal)
  // effect sẽ chạy lại và làm mất focus của ô đang gõ.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return undefined

    // Ghi nhớ phần tử đang focus để trả focus lại khi đóng modal
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()
    }
  }, [open])

  if (!open) return null

  // Dùng mousedown: kéo bôi đen chữ từ trong modal ra ngoài không làm modal đóng
  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget) onClose()
  }

  // Portal: gắn modal vào body để không bị che bởi overflow hay z-index của trang
  return createPortal(
    <div className={styles.overlay} onMouseDown={handleOverlayMouseDown}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <div className={styles.header}>
          {title && (
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export default Modal
