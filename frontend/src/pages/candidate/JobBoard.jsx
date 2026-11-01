import { useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getJobs } from '../../api/job.api'
import { getRecommendedJobs } from '../../api/matching.api'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import Pagination from '../../components/common/Pagination'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/apiError'
import { formatDate } from '../../utils/format'
import { ROLES } from '../../utils/roles'
import RecommendedJobsPanel from './RecommendedJobsPanel'
import styles from './JobBoard.module.css'

// 9 tin mỗi trang: vừa 3 hàng của lưới 3 cột
const PAGE_SIZE = 9

// Tab nằm trên URL: "/" là Tất cả, "/?view=recommended" là Gợi ý theo CV
const VIEW_ALL = 'all'
const VIEW_RECOMMENDED = 'recommended'

// Bảng tin việc làm, trang chủ công khai "/": ai cũng xem được, không cần đăng nhập.
// Ứng viên có thêm tab "Gợi ý theo CV của bạn" (T35d, thay cho trang /candidate/recommended-jobs)
function JobBoard() {
  const { isAuthenticated, role } = useAuth()
  const isCandidate = isAuthenticated && role === ROLES.CANDIDATE

  const [searchParams, setSearchParams] = useSearchParams()
  // Trang hiện tại nằm trên URL (?page=2): tải lại trang hoặc bấm Back vẫn đúng trang
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  // Khách, HR, Admin không có tab: luôn xem Tất cả, kể cả khi URL có ?view=recommended
  const view = isCandidate && searchParams.get('view') === VIEW_RECOMMENDED ? VIEW_RECOMMENDED : VIEW_ALL

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Gợi ý theo CV: tải ngay khi vào trang (kể cả đang ở tab Tất cả) để tab hiện được số tin
  const [recommended, setRecommended] = useState(null)
  const [recommendedLoading, setRecommendedLoading] = useState(isCandidate)
  const [recommendedError, setRecommendedError] = useState('')
  const [recommendedReloadKey, setRecommendedReloadKey] = useState(0)

  const tabsId = useId()
  const tabRefs = { [VIEW_ALL]: useRef(null), [VIEW_RECOMMENDED]: useRef(null) }

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

  // Chỉ ứng viên mới gọi API gợi ý (API chỉ cho role CANDIDATE)
  useEffect(() => {
    if (!isCandidate) return undefined
    let ignore = false
    getRecommendedJobs()
      .then((result) => {
        if (!ignore) setRecommended(result.data)
      })
      .catch((err) => {
        if (!ignore) setRecommendedError(getErrorMessage(err, 'Không tải được việc làm gợi ý'))
      })
      .finally(() => {
        if (!ignore) setRecommendedLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [isCandidate, recommendedReloadKey])

  // Giữ các tham số khác trên URL (vd ?page=2) khi đổi tab, quay lại Tất cả vẫn đúng trang cũ
  function selectView(nextView) {
    if (nextView === view) return
    const params = new URLSearchParams(searchParams)
    if (nextView === VIEW_RECOMMENDED) {
      params.set('view', VIEW_RECOMMENDED)
    } else {
      params.delete('view')
    }
    setSearchParams(params)
  }

  // Bàn phím trên tab: mũi tên trái / phải chuyển tab, Home / End về tab đầu / cuối
  function handleTabKeyDown(event) {
    let nextView = null
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      nextView = view === VIEW_ALL ? VIEW_RECOMMENDED : VIEW_ALL
    } else if (event.key === 'Home') {
      nextView = VIEW_ALL
    } else if (event.key === 'End') {
      nextView = VIEW_RECOMMENDED
    }
    if (!nextView) return
    event.preventDefault()
    selectView(nextView)
    tabRefs[nextView].current.focus()
  }

  function handlePageChange(nextPage) {
    setLoading(true)
    const params = new URLSearchParams(searchParams)
    if (nextPage === 1) {
      params.delete('page')
    } else {
      params.set('page', String(nextPage))
    }
    setSearchParams(params)
    window.scrollTo(0, 0)
  }

  function handleRetry() {
    setError('')
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  function handleRecommendedRetry() {
    setRecommendedError('')
    setRecommendedLoading(true)
    setRecommendedReloadKey((key) => key + 1)
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

  const allPanel = (
    <>
      {data && data.pagination.total > 0 && !loading && (
        <p className={styles.intro}>Có {data.pagination.total} vị trí đang tuyển, tin mới đăng ở trước.</p>
      )}
      {content}
    </>
  )

  // Khách, HR, Admin: chỉ danh sách như trước T35d
  if (!isCandidate) {
    return (
      <>
        <h1>Việc làm đang tuyển</h1>
        {allPanel}
      </>
    )
  }

  // Số trong ngoặc chỉ hiện khi đã có dữ liệu thật, chưa có thì tab chỉ có chữ
  const allCount = data && !error ? data.pagination.total : null
  const recommendedCount = recommended && !recommendedError ? recommended.items.length : null

  const tabs = [
    { view: VIEW_ALL, label: 'Tất cả', count: allCount },
    { view: VIEW_RECOMMENDED, label: 'Gợi ý theo CV của bạn', count: recommendedCount },
  ]

  return (
    <>
      <h1>Việc làm</h1>
      <div className={styles.tabs} role="tablist" aria-label="Danh sách việc làm">
        {tabs.map((tab) => {
          const selected = tab.view === view
          return (
            <button
              key={tab.view}
              ref={tabRefs[tab.view]}
              id={`${tabsId}-tab-${tab.view}`}
              type="button"
              role="tab"
              className={selected ? `${styles.tab} ${styles.tabSelected}` : styles.tab}
              aria-selected={selected}
              aria-controls={`${tabsId}-panel-${tab.view}`}
              // Chỉ tab đang chọn nằm trong thứ tự Tab, chuyển tab bằng mũi tên
              tabIndex={selected ? 0 : -1}
              onClick={() => selectView(tab.view)}
              onKeyDown={handleTabKeyDown}
            >
              {tab.label}
              {tab.count !== null && ` (${tab.count})`}
            </button>
          )
        })}
      </div>

      {/* Cả 2 panel luôn nằm trong trang (panel không chọn bị ẩn) để đổi tab không phải tải lại */}
      <div
        id={`${tabsId}-panel-${VIEW_ALL}`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-tab-${VIEW_ALL}`}
        hidden={view !== VIEW_ALL}
      >
        {allPanel}
      </div>
      <div
        id={`${tabsId}-panel-${VIEW_RECOMMENDED}`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-tab-${VIEW_RECOMMENDED}`}
        hidden={view !== VIEW_RECOMMENDED}
      >
        <RecommendedJobsPanel
          data={recommended}
          loading={recommendedLoading}
          error={recommendedError}
          onRetry={handleRecommendedRetry}
        />
      </div>
    </>
  )
}

export default JobBoard
