import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRecommendedJobs } from '../../api/matching.api'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import { getErrorMessage } from '../../utils/apiError'
import { formatNumber } from '../../utils/format'
import styles from './RecommendedJobs.module.css'

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

function RecommendedJobs() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    // Một request duy nhất: mỗi item đã có job { id, title, companyName, location }
    getRecommendedJobs()
      .then((result) => {
        if (!ignore) setData(result.data)
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, 'Không tải được việc làm gợi ý'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [reloadKey])

  function handleRetry() {
    setError('')
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  let content
  if (loading) {
    content = <Loading text="Đang đối chiếu hồ sơ với các tin tuyển dụng..." />
  } else if (error) {
    content = (
      <>
        <p className={styles.alertError} role="alert">
          {error}
        </p>
        <Button variant="secondary" onClick={handleRetry}>
          Thử lại
        </Button>
      </>
    )
  } else if (data.items.length === 0 && data.message) {
    // Hồ sơ chưa có dữ liệu phân tích từ CV: hướng dẫn sang trang CV
    content = (
      <div className={styles.guide}>
        <p className={styles.guideText}>{data.message}</p>
        <Link className={styles.button} to="/candidate/cvs">
          Đến trang CV của tôi
        </Link>
      </div>
    )
  } else if (data.items.length === 0) {
    content = <p className={styles.empty}>Hiện chưa có tin tuyển dụng đang mở nào đã được phân tích yêu cầu.</p>
  } else {
    content = (
      <ul className={styles.list}>
        {data.items.map((item) => (
          <li key={item.job.id} className={styles.card}>
            <h2 className={styles.jobTitle}>{item.job.title}</h2>
            {item.job.companyName && <p className={styles.meta}>{item.job.companyName}</p>}
            {item.job.location && <p className={styles.meta}>{item.job.location}</p>}
            <CoverageBar supported={item.supported} total={item.total} coverage={item.coverage} note={item.note} />
            <Link className={styles.button} to={`/candidate/recommended-jobs/${item.job.id}`}>
              Xem chi tiết đối chiếu
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      <h1>Việc làm gợi ý</h1>
      <p className={styles.intro}>
        Các tin đang mở, xếp theo tỉ lệ yêu cầu của tin có bằng chứng trong hồ sơ của bạn (nhiều nhất 10 tin).
      </p>
      {content}
    </>
  )
}

export default RecommendedJobs
