import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getJobs } from '../../api/job.api'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import Pagination from '../../components/common/Pagination'
import { getErrorMessage } from '../../utils/apiError'
import { formatDate } from '../../utils/format'
import styles from './JobBoard.module.css'

// 9 tin mỗi trang: vừa 3 hàng của lưới 3 cột
const PAGE_SIZE = 9

// Bảng tin việc làm, trang chủ công khai "/": ai cũng xem được, không cần đăng nhập
function JobBoard() {
  const [searchParams, setSearchParams] = useSearchParams()
  // Trang hiện tại nằm trên URL (?page=2): tải lại trang hoặc bấm Back vẫn đúng trang
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    getJobs({ page, limit: PAGE_SIZE })
      .then((result) => {
        if (!ignore) setData(result.data)
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, 'Không tải được danh sách việc làm'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [page, reloadKey])

  function handlePageChange(nextPage) {
    setLoading(true)
    setSearchParams(nextPage === 1 ? {} : { page: String(nextPage) })
    window.scrollTo(0, 0)
  }

  function handleRetry() {
    setError('')
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  let content
  if (loading) {
    content = <Loading text="Đang tải việc làm..." />
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
  } else if (data.pagination.total === 0) {
    content = <p className={styles.empty}>Hiện chưa có vị trí tuyển dụng</p>
  } else if (data.items.length === 0) {
    // Có tin nhưng số trang trên URL vượt quá số trang thật (vd ?page=99)
    content = (
      <p className={styles.empty}>
        Trang này không có tin nào.{' '}
        <Link className={styles.link} to="/">
          Về trang đầu
        </Link>
      </p>
    )
  } else {
    content = (
      <>
        <ul className={styles.grid}>
          {data.items.map((job) => (
            <li key={job.id} className={styles.card}>
              <h2 className={styles.jobTitle}>{job.title}</h2>
              {job.company && <p className={styles.company}>{job.company.name}</p>}
              {job.location && <p className={styles.meta}>{job.location}</p>}
              <p className={styles.meta}>Đăng ngày {formatDate(job.createdAt)}</p>
              <div className={styles.footer}>
                <Link className={styles.button} to={`/jobs/${job.id}`}>
                  Xem chi tiết
                </Link>
              </div>
            </li>
          ))}
        </ul>
        <div className={styles.pagination}>
          <Pagination page={page} totalPages={data.pagination.totalPages} onChange={handlePageChange} />
        </div>
      </>
    )
  }

  return (
    <>
      <h1>Việc làm đang tuyển</h1>
      {data && data.pagination.total > 0 && !loading && (
        <p className={styles.intro}>Có {data.pagination.total} vị trí đang tuyển, tin mới đăng ở trước.</p>
      )}
      {content}
    </>
  )
}

export default JobBoard
