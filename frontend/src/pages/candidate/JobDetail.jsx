import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getMyProfile } from '../../api/candidate.api'
import { getCVs } from '../../api/cv.api'
import { getJobDetail, getJobs } from '../../api/job.api'
import { getMatchingDetail } from '../../api/matching.api'
import ApplyAction from '../../components/application/ApplyAction'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import JobCard from '../../components/job/JobCard'
import JobCardList from '../../components/job/JobCardList'
import CoverageBar from '../../components/matching/CoverageBar'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getErrorMessage } from '../../utils/apiError'
import { formatPostedAt } from '../../utils/format'
import { parseJobDescription } from '../../utils/jobText'
import { ROLES } from '../../utils/roles'
import styles from './JobDetail.module.css'

// Số thẻ của mục "Vị trí khác đang tuyển": lấy thêm 1 tin phòng trường hợp tin đang xem nằm trong danh sách
const RELATED_COUNT = 3

// Coverage của tin với hồ sơ ứng viên cho khung bên phải. Chỉ đối chiếu khi đã có CV phân tích xong
// (chưa có thì hồ sơ trống, coverage 0 không có nghĩa). API đối chiếu chỉ đọc DB, không gọi Gemini.
// Trả null khi không có gì để hiện
async function loadCoverage(jobId) {
  const cvResult = await getCVs()
  if (!cvResult.data.some((cv) => cv.status === 'COMPLETED')) return null
  const profileResult = await getMyProfile()
  const matchingResult = await getMatchingDetail(jobId, profileResult.data.id)
  const { supported, total, coverage, note } = matchingResult.data
  return { supported, total, coverage, note }
}

// Nội dung JD tách theo tiêu đề phần (Mô tả / Yêu cầu / Ưu tiên / Quyền lợi...) nếu HR có ghi tiêu đề,
// giữ gạch đầu dòng và xuống dòng. JD không có tiêu đề nào thì cả nội dung nằm dưới "Mô tả công việc"
function JobDescription({ description }) {
  const sections = parseJobDescription(description)
  const single = sections.length === 1 && !sections[0].heading

  return sections.map((section, index) => (
    <section key={index} className={styles.section}>
      {(section.heading || single) && <h2 className={styles.sectionTitle}>{section.heading || 'Mô tả công việc'}</h2>}
      {section.blocks.map((block, blockIndex) =>
        block.type === 'list' ? (
          <ul key={blockIndex} className={styles.list}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={blockIndex} className={styles.paragraph}>
            {block.text}
          </p>
        )
      )}
    </section>
  ))
}

// Chi tiết công việc, route công khai /jobs/:id (bố cục T35f).
// Máy tính 2 cột: trái là tin (tiêu đề, thông tin, JD), phải là khung ứng tuyển dính (position: sticky).
// Dưới 900px 1 cột: khung đối chiếu nằm ngay dưới tiêu đề, nút ứng tuyển dính ở đáy màn hình và về đúng chỗ
// cuối tin khi cuộn hết (không che nội dung cuối trang). Nút theo người xem:
//   - Chưa đăng nhập: "Ứng tuyển ngay" chuyển sang /login, đăng nhập xong quay lại /jobs/:id?apply=1
//     và tự mở hộp ứng tuyển (T35f)
//   - Ứng viên: khối Ứng tuyển dùng chung (ApplyAction) + coverage nếu đã có CV phân tích
//   - Nhà tuyển dụng, quản trị viên: không có khung bên phải, tin rộng hết vùng nội dung
function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuth()
  const isCandidate = isAuthenticated && role === ROLES.CANDIDATE
  const [searchParams, setSearchParams] = useSearchParams()
  const autoOpenApply = searchParams.get('apply') === '1'

  // Hộp ứng tuyển đã mở (hoặc không cần mở): bỏ ?apply=1 để tải lại / quay lại trang không mở lần nữa
  function clearApplyParam() {
    const params = new URLSearchParams(searchParams)
    params.delete('apply')
    setSearchParams(params, { replace: true })
  }

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  // Coverage cho khung bên phải (chỉ ứng viên), null khi không có gì để hiện
  const [coverage, setCoverage] = useState(null)
  const [related, setRelated] = useState([])

  useDocumentTitle(job ? job.title : '')

  // AppRouter mount lại trang theo mã tin (bấm thẻ "Vị trí khác" là một lần mount mới):
  // cuộn về đầu để tin mới không mở ở giữa trang
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    let ignore = false
    getJobDetail(id)
      .then((result) => {
        if (!ignore) setJob(result.data)
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, 'Không tải được tin tuyển dụng'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [id, reloadKey])

  useEffect(() => {
    if (!isCandidate) return undefined
    let ignore = false
    loadCoverage(id)
      .then((value) => {
        if (!ignore) setCoverage(value)
      })
      .catch(() => {
        // Không đối chiếu được thì khung bên phải chỉ có nút ứng tuyển
      })
    return () => {
      ignore = true
    }
  }, [id, isCandidate])

  // Vị trí khác: các tin mới nhất đang mở (API danh sách công khai), bỏ tin đang xem
  useEffect(() => {
    let ignore = false
    getJobs({ page: 1, limit: RELATED_COUNT + 1 })
      .then((result) => {
        if (ignore) return
        setRelated(result.data.items.filter((item) => String(item.id) !== String(id)).slice(0, RELATED_COUNT))
      })
      .catch(() => {
        // Không tải được thì ẩn mục này, tin vẫn hiện bình thường
      })
    return () => {
      ignore = true
    }
  }, [id])

  function handleRetry() {
    setError('')
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  // Chưa đăng nhập: gửi kèm đường dẫn job (có ?apply=1) để đăng nhập xong quay lại và tự mở hộp ứng tuyển.
  // Trang đăng nhập chỉ nhận đường dẫn nội bộ (bắt đầu bằng "/", không phải "//")
  function handleGuestApply() {
    navigate('/login', { state: { from: `/jobs/${id}?apply=1` } })
  }

  const breadcrumb = (
    <nav className={styles.breadcrumb} aria-label="Đường dẫn">
      <ol className={styles.breadcrumbList}>
        <li>
          <Link className={styles.breadcrumbLink} to="/">
            Việc làm
          </Link>
        </li>
        <li className={styles.breadcrumbCurrent} aria-current="page">
          {job ? job.title : 'Chi tiết công việc'}
        </li>
      </ol>
    </nav>
  )

  if (loading) {
    return <Loading text="Đang tải tin tuyển dụng..." />
  }

  if (error) {
    return (
      <>
        {breadcrumb}
        <h1>Chi tiết công việc</h1>
        <p className={styles.alertError} role="alert">
          {error}
        </p>
        <Button variant="secondary" onClick={handleRetry}>
          Thử lại
        </Button>
      </>
    )
  }

  // Khung ứng tuyển chỉ có với khách và ứng viên
  let applyBlock = null
  if (!isAuthenticated) {
    applyBlock = job.isOpen ? (
      <>
        <Button className={styles.fullButton} onClick={handleGuestApply}>
          Ứng tuyển ngay
        </Button>
        <p className={styles.hint}>Đăng nhập để gửi CV và theo dõi đơn ứng tuyển.</p>
      </>
    ) : (
      <p className={styles.closedText}>Tin đã ngừng nhận hồ sơ</p>
    )
  } else if (isCandidate) {
    applyBlock = (
      <ApplyAction
        jobId={job.id}
        jobTitle={job.title}
        isOpen={job.isOpen}
        autoOpen={autoOpenApply}
        onAutoOpened={clearApplyParam}
        variant="panel"
      />
    )
  }

  const matchBlock = coverage && (
    <div className={`${styles.box} ${styles.matchBox}`}>
      <h2 className={styles.boxTitle}>Đối chiếu với hồ sơ của bạn</h2>
      {coverage.total > 0 ? (
        <>
          <CoverageBar
            supported={coverage.supported}
            total={coverage.total}
            coverage={coverage.coverage}
            note={coverage.note}
          />
          <Link className={styles.boxLink} to={`/candidate/recommended-jobs/${job.id}`}>
            Xem chi tiết đối chiếu
          </Link>
        </>
      ) : (
        <p className={styles.hint}>Tin chưa có yêu cầu để đối chiếu.</p>
      )}
    </div>
  )

  const metaItems = [job.company && job.company.name, job.location, formatPostedAt(job.createdAt)].filter(Boolean)

  return (
    <>
      {breadcrumb}

      <div className={applyBlock ? styles.layout : `${styles.layout} ${styles.layoutSingle}`}>
        <header className={styles.head}>
          <h1 className={styles.title}>{job.title}</h1>
          <p className={styles.meta}>
            {metaItems.map((item, index) => (
              <span key={item} className={styles.metaItem}>
                {index > 0 && (
                  <span className={styles.metaDot} aria-hidden="true">
                    ·
                  </span>
                )}
                {item}
              </span>
            ))}
          </p>
          {!job.isOpen && (
            <span className={styles.closed}>
              <Badge status="CLOSED">Vị trí đã đóng</Badge>
            </span>
          )}
        </header>

        {applyBlock && (
          // Máy tính: một cột dính bên phải. Điện thoại: display: contents, 2 khung con xếp vào dòng chảy của trang
          <div className={styles.side}>
            <div className={`${styles.box} ${styles.applyBox}`}>{applyBlock}</div>
            {matchBlock}
          </div>
        )}

        <article className={styles.body} aria-label="Nội dung tin tuyển dụng">
          <JobDescription description={job.description} />
        </article>
      </div>

      {related.length > 0 && (
        <section className={styles.related}>
          <h2>Vị trí khác đang tuyển</h2>
          <JobCardList columns={3}>
            {related.map((item) => (
              <JobCard key={item.id} job={item} headingLevel={3} />
            ))}
          </JobCardList>
        </section>
      )}
    </>
  )
}

export default JobDetail
