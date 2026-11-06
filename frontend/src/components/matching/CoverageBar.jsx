import { formatNumber } from '../../utils/format'
import styles from './CoverageBar.module.css'

// Coverage của một tin với hồ sơ ứng viên (tách từ tab Gợi ý ở T35f để trang chi tiết tin dùng lại):
// "x/y yêu cầu có bằng chứng (z%)" + thanh màu trung tính, không thang đỏ - xanh, không nhãn đánh giá.
// Coverage chỉ là tỉ lệ yêu cầu có bằng chứng trong hồ sơ, không phải điểm năng lực (docs/design.md mục 11),
// nên note của API luôn hiện ngay dưới thanh.
function CoverageBar({ supported, total, coverage, note }) {
  const width = Math.min(Math.max(Number(coverage) || 0, 0), 100)
  return (
    <div className={styles.coverage}>
      <p className={styles.text}>
        {supported}/{total} yêu cầu có bằng chứng ({formatNumber(coverage)}%)
      </p>
      <div className={styles.track} aria-hidden="true">
        <div className={styles.fill} style={{ width: `${width}%` }} />
      </div>
      {note && <p className={styles.note}>{note}</p>}
    </div>
  )
}

export default CoverageBar
