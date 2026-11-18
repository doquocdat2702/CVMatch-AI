import { useEffect, useId, useRef, useState } from 'react'
import Badge from '../common/Badge'
import { MATCH_STATUS_LABEL } from '../../utils/labels'
import styles from './MatchStatusBadge.module.css'

// Một câu giải thích mỗi trạng thái đối chiếu. Quy tắc đầy đủ (số năm kinh nghiệm, hai kỹ năng khác nhau không tính là
// khớp...) ở docs/cach-phan-tich-va-doi-chieu.md mục 8.4, không đưa lên giao diện.
const MATCH_STATUS_HINT = {
  SUPPORTED: 'Hồ sơ có kỹ năng hoặc bằng cấp đúng với yêu cầu.',
  UNCERTAIN: 'Hồ sơ có dấu hiệu liên quan nhưng chưa đủ rõ.',
  NOT_FOUND: 'Hồ sơ chưa có thông tin về yêu cầu này.',
}

// Badge trạng thái đối chiếu kèm chú thích (thay khối "Cách đọc bảng này"), dùng trong RequirementEvidenceMatrix nên
// cả trang Chi tiết đối chiếu (ứng viên) và CandidateMatrixModal (HR) đều có.
// - Chuột: thuộc tính title của HTML, trình duyệt tự hiện khi rê chuột (không thư viện tooltip).
// - Cảm ứng / bàn phím: Badge nằm trong một nút; bấm (hoặc Enter / Space) thì câu chú thích hiện ngay dưới Badge,
//   bấm ra ngoài hoặc Esc thì ẩn. Hiện trong ô chứ không nổi, vì khung bảng có overflow-x: auto sẽ cắt phần nổi ra ngoài.
// - Trình đọc màn hình: nút trỏ aria-describedby tới câu chú thích; câu luôn có trong DOM (ẩn bằng srOnly khi đóng).
// Đang mở thì bỏ title để chuột không hiện cùng lúc hai chú thích.
function MatchStatusBadge({ status }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const hintId = useId()
  const label = MATCH_STATUS_LABEL[status] || status
  const hint = MATCH_STATUS_HINT[status]

  useEffect(() => {
    if (!open) return undefined
    function handlePointerDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  // Trạng thái lạ (không có câu chú thích): Badge thường như trước
  if (!hint) return <Badge status={status}>{label}</Badge>

  return (
    <span ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        title={open ? undefined : hint}
        aria-describedby={hintId}
        onClick={() => setOpen((value) => !value)}
      >
        <Badge status={status}>{label}</Badge>
      </button>
      <span id={hintId} className={open ? styles.hint : styles.srOnly}>
        {hint}
      </span>
    </span>
  )
}

export default MatchStatusBadge
