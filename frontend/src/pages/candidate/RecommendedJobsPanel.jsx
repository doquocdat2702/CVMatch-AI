import { Link } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Pagination from '../../components/common/Pagination'
import JobCardSkeleton from '../../components/job/JobCardSkeleton'
import CoverageBar from '../../components/matching/CoverageBar'
import { CARD_PAGE_SIZE, paginate } from '../../utils/pagination'
import styles from './RecommendedJobsPanel.module.css'

// Nội dung tab "Gợi ý theo CV của bạn" trong trang Việc làm (T35d, trước là trang /candidate/recommended-jobs).
// JobBoard gọi API GET /matching/recommended-jobs (để tab hiện được số tin) rồi truyền kết quả xuống:
//   data: { items, note, message? } | null, loading, error, onRetry
//   page, onPageChange: phân trang phía client (D1), API trả cả danh sách đã xếp theo coverage
//   appliedJobIds: Set mã tin đã nộp đơn (JobBoard lấy một lần) để gắn nhãn "Đã ứng tuyển" (T35f)
// Thẻ cùng kiểu với thẻ tin của tab Tất cả (T35f): tiêu đề serif, cả thẻ bấm được, rê chuột viền Xanh mực
function RecommendedJobsPanel({ data, loading, error, onRetry, page = 1, onPageChange, appliedJobIds }) {
  if (loading || (!error && !data)) {
    return <JobCardSkeleton count={4} text="Đang đối chiếu hồ sơ với các tin tuyển dụng..." />
  }

  if (error) {
    return (
      <div className={styles.state}>
        <p className={styles.alertError} role="alert">
          {error}
        </p>
        <Button variant="secondary" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    )
  }

  if (data.items.length === 0 && data.message) {
    // Hồ sơ chưa có dữ liệu phân tích từ CV: hướng dẫn sang trang CV
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Bạn chưa có CV đã phân tích.</p>
        <p className={styles.emptyText}>Tải CV lên để xem tin có yêu cầu khớp với hồ sơ.</p>
        <Link className={styles.primaryLink} to="/candidate/cvs">
          Đến CV của tôi
        </Link>
      </div>
    )
  }

  if (data.items.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Hiện chưa có tin đang mở nào đã được phân tích yêu cầu.</p>
      </div>
    )
  }

  const { pageItems, page: currentPage, totalPages } = paginate(data.items, page, CARD_PAGE_SIZE)

  return (
    <>
      <p className={styles.intro}>
        Các tin đang mở, xếp theo tỉ lệ yêu cầu của tin có bằng chứng trong hồ sơ của bạn (nhiều nhất 50 tin).
      </p>
      <ul className={styles.list}>
        {pageItems.map((item) => (
          <li key={item.job.id} className={styles.card}>
            <h2 className={styles.jobTitle}>{item.job.title}</h2>
            {item.job.location && <p className={styles.meta}>{item.job.location}</p>}
            <div className={styles.coverage}>
              <CoverageBar supported={item.supported} total={item.total} coverage={item.coverage} note={item.note} />
            </div>
            <div className={styles.footer}>
              {/* Link phủ cả thẻ: bấm chỗ nào trong thẻ cũng mở chi tiết đối chiếu.
                  Tên tin nằm trong link (ẩn) để trình đọc màn hình phân biệt các link với nhau */}
              <Link className={styles.button} to={`/candidate/recommended-jobs/${item.job.id}`}>
                Xem chi tiết đối chiếu<span className={styles.srOnly}>: {item.job.title}</span>
              </Link>
              {appliedJobIds && appliedJobIds.has(item.job.id) && <Badge status="APPLIED">Đã ứng tuyển</Badge>}
            </div>
          </li>
        ))}
      </ul>
      <div className={styles.pagination}>
        <Pagination page={currentPage} totalPages={totalPages} onChange={onPageChange} />
      </div>
    </>
  )
}

export default RecommendedJobsPanel
