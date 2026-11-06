import { APPLICATION_STATUS_LABEL } from '../../utils/labels'
import styles from './ApplicationProgress.module.css'

// Đơn đi 3 bước: Đã nộp -> Đang xem xét -> Kết quả (Đã chấp nhận / Đã từ chối)
const STEP_OF_STATUS = { APPLIED: 1, REVIEWING: 2, ACCEPTED: 3, REJECTED: 3 }
const STEPS = [1, 2, 3]
const TOTAL_STEPS = STEPS.length

// Thanh tiến trình của một đơn ứng tuyển (T35f), vẽ bằng CSS: các đoạn đã qua tô Xanh mực.
// Dòng chữ "Bước 2/3: Đang xem xét" hiện ngay dưới thanh, trình đọc màn hình đọc dòng này
// (thanh chỉ để nhìn nên aria-hidden). Màu kết quả nằm ở Badge trạng thái, thanh không dùng đỏ - xanh
function ApplicationProgress({ status }) {
  const step = STEP_OF_STATUS[status] || 1
  const label = APPLICATION_STATUS_LABEL[status] || status

  return (
    <div className={styles.progress}>
      <div className={styles.bar} aria-hidden="true">
        {STEPS.map((index) => (
          <span key={index} className={index <= step ? `${styles.segment} ${styles.done}` : styles.segment} />
        ))}
      </div>
      <span className={styles.caption}>
        Bước {step}/{TOTAL_STEPS}: {label}
      </span>
    </div>
  )
}

export default ApplicationProgress
