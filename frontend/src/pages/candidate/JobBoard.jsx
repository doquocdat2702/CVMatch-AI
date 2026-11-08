import { useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getMyApplications } from '../../api/application.api'
import { getPublicCompany } from '../../api/company.api'
import { getCVs } from '../../api/cv.api'
import { getJobs } from '../../api/job.api'
import { getRecommendedJobs } from '../../api/matching.api'
import Button from '../../components/common/Button'
import Pagination from '../../components/common/Pagination'
import JobCard from '../../components/job/JobCard'
import JobCardList from '../../components/job/JobCardList'
import JobCardSkeleton from '../../components/job/JobCardSkeleton'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getErrorMessage } from '../../utils/apiError'
import { APP_NAME } from '../../utils/appConfig'
import { CARD_PAGE_SIZE, readPage, withPage } from '../../utils/pagination'
import { ROLES } from '../../utils/roles'
import RecommendedJobsPanel from './RecommendedJobsPanel'
import styles from './JobBoard.module.css'

// Tab nằm trên URL: "/" là Tất cả, "/?view=recommended" là Gợi ý theo CV
const VIEW_ALL = 'all'
const VIEW_RECOMMENDED = 'recommended'

// Gợi ý: lấy cả danh sách (mức tối đa API cho phép, recommend.service MAX_LIMIT) rồi phân trang phía client
const RECOMMENDED_LIMIT = 50

// Ô tìm kiếm nhận tối đa bằng độ dài cột title của Job
const SEARCH_MAX_LENGTH = 255

// Khối mở đầu trang chủ (T35f), chung cho khách và ứng viên: nền Xanh mực đặc, tên công ty serif lớn,
// số vị trí đang tuyển và ô tìm theo tên vị trí (tham số keyword của GET /jobs, lọc theo tiêu đề tin).
// T35g bỏ ô địa điểm: địa điểm vẫn hiện trên thẻ tin và trang chi tiết.
// Form không điều khiển (defaultValue) và đổi key theo URL: bấm Back / Xóa bộ lọc thì ô nhập lấy lại giá trị trên URL.
//   companyName: undefined khi đang tải (giữ chỗ để chữ không nhảy); openTotal: null khi chưa có số
//   contained: HR / Admin xem trang này trong MainLayout (có Sidebar) nên khối không tràn hết bề ngang
function SearchHero({ companyName, openTotal, keyword, onSearch, contained }) {
  const keywordId = useId()

  function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSearch(String(form.get('keyword')).trim())
  }

  let countText = ' '
  if (openTotal === 0) countText = 'Hiện chưa có vị trí đang tuyển'
  else if (openTotal !== null) countText = `${openTotal} vị trí đang tuyển`

  return (
    <section className={contained ? `${styles.hero} ${styles.heroContained}` : styles.hero}>
      <div className={styles.heroInner}>
        <h1 className={styles.heroTitle}>
          <span className={styles.heroLead}>Cơ hội nghề nghiệp tại</span>{' '}
          <span className={styles.heroCompany}>{companyName === undefined ? ' ' : companyName}</span>
        </h1>
        <p className={styles.heroCount}>{countText}</p>

        <form key={keyword} className={styles.search} role="search" onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.srOnly} htmlFor={keywordId}>
              Tên vị trí
            </label>
            <input
              id={keywordId}
              className={styles.input}
              type="search"
              name="keyword"
              defaultValue={keyword}
              placeholder="Tên vị trí, ví dụ: Kế toán"
              maxLength={SEARCH_MAX_LENGTH}
              autoComplete="off"
            />
          </div>
          <button type="submit" className={styles.searchButton}>
            Tìm
          </button>
        </form>
      </div>
    </section>
  )
}

// Bảng tin việc làm, trang chủ công khai "/": ai cũng xem được, không cần đăng nhập.
// Ứng viên có thêm tab "Gợi ý theo CV của bạn" (T35d, thay cho trang /candidate/recommended-jobs).
// Tìm kiếm (T35f) nằm trên URL (?keyword=) và chỉ áp cho tab Tất cả: tìm thì về tab Tất cả,
// sang tab Gợi ý thì bỏ bộ lọc (danh sách gợi ý là toàn bộ tin đã xếp theo coverage)
function JobBoard() {
  const { isAuthenticated, role } = useAuth()
  const isCandidate = isAuthenticated && role === ROLES.CANDIDATE
  // Khách và ứng viên xem trong SiteLayout; HR / Admin vào "/" thì trang nằm trong MainLayout
  const inSiteLayout = !isAuthenticated || isCandidate

  useDocumentTitle('Việc làm')

  const [searchParams, setSearchParams] = useSearchParams()
  // Trang hiện tại nằm trên URL (?page=2): tải lại trang hoặc bấm Back vẫn đúng trang
  const page = readPage(searchParams)
  // Khách, HR, Admin không có tab: luôn xem Tất cả, kể cả khi URL có ?view=recommended
  const view = isCandidate && searchParams.get('view') === VIEW_RECOMMENDED ? VIEW_RECOMMENDED : VIEW_ALL
  // ?page= thuộc về tab đang mở; tab còn lại luôn ở trang 1 (đổi tab là về trang 1)
  const jobsPage = view === VIEW_ALL ? page : 1
  const recommendedPage = view === VIEW_RECOMMENDED ? page : 1
  const keyword = (searchParams.get('keyword') || '').trim()
  const filterActive = Boolean(keyword)

  // Kết quả gắn với đúng truy vấn đã gửi: truy vấn trên URL đổi (đổi trang, tìm kiếm, bấm Back) thì
  // key khác nhau nghĩa là đang tải, không phải tự bật / tắt cờ loading ở từng chỗ
  const [reloadKey, setReloadKey] = useState(0)
  const queryKey = JSON.stringify([jobsPage, keyword, reloadKey])
  const [jobsResult, setJobsResult] = useState({ key: null, data: null, error: '' })
  const loading = jobsResult.key !== queryKey
  const data = loading ? null : jobsResult.data
  const error = loading ? '' : jobsResult.error

  // Tổng số tin đang mở (không lọc) cho dòng "N vị trí đang tuyển" của khối mở đầu
  const [openTotal, setOpenTotal] = useState(null)
  // undefined = đang tải tên công ty; lỗi thì dùng tên hệ thống
  const [companyName, setCompanyName] = useState(undefined)

  // Gợi ý theo CV: tải ngay khi vào trang (kể cả đang ở tab Tất cả) để tab hiện được số tin
  const [recommended, setRecommended] = useState(null)
  const [recommendedLoading, setRecommendedLoading] = useState(isCandidate)
  const [recommendedError, setRecommendedError] = useState('')
  const [recommendedReloadKey, setRecommendedReloadKey] = useState(0)

  // Mã các tin ứng viên đã nộp đơn: lấy MỘT lần khi vào trang (không gọi theo từng tin) để gắn nhãn "Đã ứng tuyển"
  const [appliedJobIds, setAppliedJobIds] = useState(() => new Set())
  // CV của ứng viên cho dòng nhắc phía trên danh sách: 'none' chưa có CV, 'unanalysed' chưa có CV đã phân tích,
  // 'ready' đã có; null khi chưa biết (đang tải hoặc lỗi thì không nhắc)
  const [cvState, setCvState] = useState(null)

  const tabsId = useId()
  const tabRefs = { [VIEW_ALL]: useRef(null), [VIEW_RECOMMENDED]: useRef(null) }
  // Đổi trang thì cuộn tới đầu danh sách (dưới khối mở đầu), không cuộn lên tận đầu trang
  const resultsRef = useRef(null)

  useEffect(() => {
    let ignore = false
    getPublicCompany()
      .then((result) => {
        if (!ignore) setCompanyName(result.data.name || APP_NAME)
      })
      .catch(() => {
        if (!ignore) setCompanyName(APP_NAME)
      })
    getJobs({ page: 1, limit: 1 })
      .then((result) => {
        if (!ignore) setOpenTotal(result.data.pagination.total)
      })
      .catch(() => {
        // Không có số thì khối mở đầu chỉ bỏ dòng này
      })
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!isCandidate) return undefined
    let ignore = false
    getMyApplications()
      .then((result) => {
        if (!ignore) setAppliedJobIds(new Set(result.data.items.map((item) => item.job.id)))
      })
      .catch(() => {
        // Không tải được thì chỉ thiếu nhãn, bảng tin vẫn hiện bình thường
      })
    getCVs()
      .then((result) => {
        if (ignore) return
        if (result.data.length === 0) setCvState('none')
        else setCvState(result.data.some((cv) => cv.status === 'COMPLETED') ? 'ready' : 'unanalysed')
      })
      .catch(() => {
        // Không biết tình trạng CV thì không nhắc
      })
    return () => {
      ignore = true
    }
  }, [isCandidate])

  useEffect(() => {
    let ignore = false
    const key = queryKey
    getJobs({ page: jobsPage, limit: CARD_PAGE_SIZE, keyword })
      .then((result) => {
        if (!ignore) setJobsResult({ key, data: result.data, error: '' })
      })
      .catch((err) => {
        if (!ignore) {
          setJobsResult({ key, data: null, error: getErrorMessage(err, 'Không tải được danh sách tin tuyển dụng.') })
        }
      })
    return () => {
      ignore = true
    }
  }, [queryKey, jobsPage, keyword])

  // Chỉ ứng viên mới gọi API gợi ý (API chỉ cho role CANDIDATE)
  useEffect(() => {
    if (!isCandidate) return undefined
    let ignore = false
    getRecommendedJobs(RECOMMENDED_LIMIT)
      .then((result) => {
        if (!ignore) setRecommended(result.data)
      })
      .catch((err) => {
        if (!ignore) setRecommendedError(getErrorMessage(err, 'Không tải được việc làm gợi ý.'))
      })
      .finally(() => {
        if (!ignore) setRecommendedLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [isCandidate, recommendedReloadKey])

  // Đổi tab thì về trang 1 của tab mới (D1). Sang tab Gợi ý thì bỏ bộ lọc tìm kiếm (chỉ áp cho tab Tất cả)
  function selectView(nextView) {
    if (nextView === view) return
    const params = withPage(searchParams, 1)
    if (nextView === VIEW_RECOMMENDED) {
      params.set('view', VIEW_RECOMMENDED)
      params.delete('keyword')
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

  // Tìm: về tab Tất cả, trang 1. Ô để trống thì bỏ tham số đó khỏi URL
  // ?location= của link cũ (trước T35g) cũng bỏ luôn
  function handleSearch(nextKeyword) {
    const params = withPage(searchParams, 1)
    params.delete('view')
    if (nextKeyword) params.set('keyword', nextKeyword)
    else params.delete('keyword')
    params.delete('location')
    setSearchParams(params)
  }

  function clearFilter() {
    handleSearch('')
  }

  function scrollToResults() {
    if (resultsRef.current) resultsRef.current.scrollIntoView({ block: 'start' })
  }

  function handlePageChange(nextPage) {
    setSearchParams(withPage(searchParams, nextPage))
    scrollToResults()
  }

  // Tab Gợi ý phân trang phía client: dữ liệu đã có sẵn, chỉ đổi ?page=
  function handleRecommendedPageChange(nextPage) {
    setSearchParams(withPage(searchParams, nextPage))
    scrollToResults()
  }

  function handleRetry() {
    setReloadKey((key) => key + 1)
  }

  function handleRecommendedRetry() {
    setRecommendedError('')
    setRecommendedLoading(true)
    setRecommendedReloadKey((key) => key + 1)
  }

  let content
  if (loading) {
    content = <JobCardSkeleton count={4} />
  } else if (error) {
    content = (
      <div className={styles.state}>
        <p className={styles.alertError} role="alert">
          {error}
        </p>
        <Button variant="secondary" onClick={handleRetry}>
          Thử lại
        </Button>
      </div>
    )
  } else if (data.pagination.total === 0 && filterActive) {
    content = (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Không có vị trí nào khớp với “{keyword}”.</p>
        <p className={styles.emptyText}>Thử tên vị trí ngắn hơn hoặc một từ khóa khác.</p>
        <Button variant="secondary" onClick={clearFilter}>
          Xóa bộ lọc
        </Button>
      </div>
    )
  } else if (data.pagination.total === 0) {
    content = (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Hiện chưa có vị trí đang tuyển.</p>
        <p className={styles.emptyText}>Tin mới sẽ hiện ở đây ngay khi được đăng.</p>
      </div>
    )
  } else if (data.items.length === 0) {
    // Có tin nhưng số trang trên URL vượt quá số trang thật (vd ?page=99)
    content = (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Trang này không có tin tuyển dụng nào.</p>
        <Button variant="secondary" onClick={() => handlePageChange(1)}>
          Về trang đầu
        </Button>
      </div>
    )
  } else {
    content = (
      <>
        <JobCardList>
          {data.items.map((job) => (
            // Khách: thẻ nằm dưới h2 "Vị trí đang tuyển"; ứng viên: dưới cụm tab, thẻ là h2
            <JobCard key={job.id} job={job} applied={appliedJobIds.has(job.id)} headingLevel={isCandidate ? 2 : 3} />
          ))}
        </JobCardList>
        <div className={styles.pagination}>
          <Pagination page={jobsPage} totalPages={data.pagination.totalPages} onChange={handlePageChange} />
        </div>
      </>
    )
  }

  // Câu kết quả khi đang lọc, kèm nút bỏ lọc (danh sách rỗng thì khối rỗng đã có nút này)
  const filterSummary = filterActive && data && data.pagination.total > 0 && (
    <div className={styles.filterSummary}>
      <p className={styles.filterText} role="status">
        {data.pagination.total} vị trí khớp với “{keyword}”
      </p>
      <Button variant="ghost" size="sm" onClick={clearFilter}>
        Xóa bộ lọc
      </Button>
    </div>
  )

  // Ứng viên chưa có CV đã phân tích: một dòng nhắc gọn phía trên danh sách
  let cvReminder = null
  if (isCandidate && (cvState === 'none' || cvState === 'unanalysed')) {
    cvReminder = (
      <p className={styles.reminder}>
        {cvState === 'none'
          ? 'Tải CV để ứng tuyển nhanh và xem gợi ý việc làm theo hồ sơ.'
          : 'Phân tích CV để ứng tuyển nhanh và xem gợi ý việc làm theo hồ sơ.'}{' '}
        <Link className={styles.reminderLink} to="/candidate/cvs">
          {cvState === 'none' ? 'Tải CV lên' : 'Đến CV của tôi'}
        </Link>
      </p>
    )
  }

  const allPanel = (
    <>
      {cvReminder}
      {filterSummary}
      {content}
    </>
  )

  const hero = (
    <SearchHero
      companyName={companyName}
      openTotal={openTotal}
      keyword={keyword}
      onSearch={handleSearch}
      contained={!inSiteLayout}
    />
  )

  // Khách, HR, Admin: chỉ danh sách, không tab
  if (!isCandidate) {
    return (
      <>
        {hero}
        <div ref={resultsRef} className={styles.results}>
          <h2 className={styles.resultsTitle}>Vị trí đang tuyển</h2>
          {allPanel}
        </div>
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
      {hero}
      <div ref={resultsRef} className={styles.results}>
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
            page={recommendedPage}
            onPageChange={handleRecommendedPageChange}
            appliedJobIds={appliedJobIds}
          />
        </div>
      </div>
    </>
  )
}

export default JobBoard
