import { Link } from 'react-router-dom'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import { formatNumber } from '../../utils/format'
import styles from './RecommendedJobsPanel.module.css'

// Thanh coverage màu trung tính, không dùng thang đỏ - xanh: coverage chỉ là tỉ lệ yêu cầu
// có bằng chứng trong hồ sơ, không phải điểm năng lực (docs/design.md mục 11).
// Dòng note của API luôn hiện ngay dưới thanh.
function CoverageBar({ supported, total, coverage, note }) {
  const width = Math.min(Math.max(Number(coverage) || 0, 0), 100)
  return (
    <div className={styles.coverage}>
      <p className={styles.coverageText}>
        {supported}/{total} yêu cầu có bằng chứng ({formatNumber(coverage)}%)
      </p>
      <div className={styles.track} aria-hidden="true">
        <div className={styles.fill} style={{ width: `${width}%` }} />
      </div>
      <p className={styles.note}>{note}</p>
    </div>
  )
}

// Nội dung tab "Gợi ý theo CV của bạn" trong trang Việc làm (T35d, trước là trang /candidate/recommended-jobs).
// JobBoard gọi API GET /matching/recommended-jobs (để tab hiện được số tin) rồi truyền kết quả xuống:
//   data: { items, note, message? } | null, loading, error, onRetry
function RecommendedJobsPanel({ data, loading, error, onRetry }) {
  if (loading || (!error && !data)) {
    return <Loading text="Đang đối chiếu hồ sơ với các tin tuyển dụng..." />
  }

  if (error) {
    return (
      <>
        <p className={styles.alertError} role="alert">
          {error}
        </p>
        <Button variant="secondary" onClick={onRetry}>
          Thử lại
        </Button>
      </>
    )
  }

  if (data.items.length === 0 && data.message) {
    // Hồ sơ chưa có dữ liệu phân tích từ CV: hướng dẫn sang trang CV
    return (
      <div className={styles.guide}>
        <p className={styles.guideText}>
          Bạn chưa có CV đã phân tích. Tải CV lên để xem tin có yêu cầu khớp với hồ sơ.
        </p>
        <Link className={styles.button} to="/candidate/cvs">
          Đến CV của tôi
        </Link>
      </div>
    )
  }

  if (data.items.length === 0) {
    return <p className={styles.empty}>Hiện chưa có tin tuyển dụng đang mở nào đã được phân tích yêu cầu.</p>
  }

  return (
    <>
      <p className={styles.intro}>
        Các tin đang mở, xếp theo tỉ lệ yêu cầu của tin có bằng chứng trong hồ sơ của bạn (nhiều nhất 10 tin).
      </p>
      <ul className={styles.list}>
        {data.items.map((item) => (
          <li key={item.job.id} className={styles.card}>
            <h2 className={styles.jobTitle}>{item.job.title}</h2>
            {item.job.companyName && <p className={styles.meta}>{item.job.companyName}</p>}
            {item.job.location && <p className={styles.meta}>{item.job.location}</p>}
            <CoverageBar supported={item.supported} total={item.total} coverage={item.coverage} note={item.note} />
            {/* Link phủ cả card: bấm chỗ nào trong card cũng mở chi tiết đối chiếu.
                Tên tin nằm trong link (ẩn) để trình đọc màn hình phân biệt các link với nhau */}
            <Link className={styles.button} to={`/candidate/recommended-jobs/${item.job.id}`}>
              Xem chi tiết đối chiếu<span className={styles.srOnly}>: {item.job.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

export default RecommendedJobsPanel
