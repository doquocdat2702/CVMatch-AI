import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMyProfile } from '../../api/candidate.api'
import { getJobDetail } from '../../api/job.api'
import { getMatchingDetail } from '../../api/matching.api'
import ApplyAction from '../../components/application/ApplyAction'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import JobDescription from '../../components/job/JobDescription'
import CoverageBar from '../../components/matching/CoverageBar'
import RequirementEvidenceMatrix from '../../components/matching/RequirementEvidenceMatrix'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getErrorMessage } from '../../utils/apiError'
import styles from './MatchingDetail.module.css'

// Link nhỏ ở dòng "Không tìm thấy": sửa / bổ sung hồ sơ ở trang Kết quả phân tích CV
const NOT_FOUND_LINK = { to: '/candidate/cvs/parsed', label: 'Cập nhật hồ sơ' }

// Lấy cùng lúc hồ sơ (để biết mã ứng viên) và chi tiết job, xong mới gọi ma trận đối chiếu.
// Đơn đã nộp do ApplyAction tự kiểm tra.
async function loadDetail(jobId) {
  const [profileResult, jobResult] = await Promise.all([getMyProfile(), getJobDetail(jobId)])
  const matchingResult = await getMatchingDetail(jobId, profileResult.data.id)
  return { job: jobResult.data, matching: matchingResult.data }
}

// Chi tiết đối chiếu của ứng viên với một tin (T35j):
// kết quả tổng ở đầu (x/y + thanh + đếm theo trạng thái), bảng chia nhóm theo loại (Badge trạng thái có chú thích),
// mô tả công việc trình bày như trang chi tiết tin. Không hiện note của API (CLAUDE.md mục 5)
function MatchingDetail() {
  const { jobId } = useParams()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useDocumentTitle(detail ? `Đối chiếu: ${detail.job.title}` : 'Chi tiết đối chiếu')

  useEffect(() => {
    let ignore = false
    loadDetail(jobId)
      .then((result) => {
        if (!ignore) setDetail(result)
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, 'Không tải được kết quả đối chiếu'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [jobId, reloadKey])

  function handleRetry() {
    setError('')
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  // Danh sách gợi ý là tab "Gợi ý theo CV của bạn" trong trang Việc làm (T35d)
  const backLink = (
    <Link className={styles.backLink} to="/?view=recommended">
      Quay lại việc làm gợi ý
    </Link>
  )

  if (loading) {
    return <Loading text="Đang đối chiếu yêu cầu với hồ sơ của bạn..." />
  }

  if (error) {
    return (
      <>
        {backLink}
        <h1>Chi tiết đối chiếu</h1>
        <p className={styles.alertError} role="alert">
          {error}
        </p>
        <Button variant="secondary" onClick={handleRetry}>
          Thử lại
        </Button>
      </>
    )
  }

  const { job, matching } = detail
  const companyName = job.company ? job.company.name : ''
  const countOf = (status) => matching.matrix.filter((row) => row.status === status).length
  const counts = [
    { status: 'SUPPORTED', text: `${countOf('SUPPORTED')} có bằng chứng` },
    { status: 'UNCERTAIN', text: `${countOf('UNCERTAIN')} chưa chắc chắn` },
    { status: 'NOT_FOUND', text: `${countOf('NOT_FOUND')} không tìm thấy` },
  ]

  return (
    <>
      {backLink}

      <div className={styles.header}>
        <div className={styles.jobInfo}>
          <h1 className={styles.title}>{job.title}</h1>
          {companyName && <p className={styles.meta}>{companyName}</p>}
          {job.location && <p className={styles.meta}>{job.location}</p>}
          {!job.isOpen && <p className={styles.closed}>Tin tuyển dụng đã đóng</p>}
        </div>

        {/* Khối Ứng tuyển dùng chung với trang Chi tiết công việc */}
        <ApplyAction jobId={job.id} jobTitle={job.title} isOpen={job.isOpen} />
      </div>

      {/* Kết quả tổng ở đầu trang */}
      <section className={styles.summary} aria-labelledby="matching-summary-title">
        <h2 id="matching-summary-title" className={styles.summaryTitle}>
          Kết quả đối chiếu
        </h2>
        {matching.total > 0 ? (
          <>
            <CoverageBar supported={matching.supported} total={matching.total} coverage={matching.coverage} />
            <ul className={styles.counts} aria-label="Số yêu cầu theo trạng thái">
              {counts.map((item) => (
                <li key={item.status} className={styles.countItem}>
                  <span className={`${styles.countMark} ${styles[`mark${item.status}`]}`} aria-hidden="true" />
                  {item.text}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className={styles.muted}>{matching.message || 'Tin tuyển dụng chưa có yêu cầu để đối chiếu.'}</p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="matching-table-title">
        <h2 id="matching-table-title" className={styles.sectionTitle}>
          Đối chiếu từng yêu cầu
        </h2>
        <RequirementEvidenceMatrix
          matrix={matching.matrix}
          emptyText={matching.message || 'Tin tuyển dụng chưa có yêu cầu để đối chiếu'}
          notFoundLink={NOT_FOUND_LINK}
        />
      </section>

      {job.description && (
        <details className={styles.description}>
          <summary className={styles.descriptionToggle}>Mô tả công việc</summary>
          <div className={styles.descriptionBody}>
            <JobDescription description={job.description} headingLevel={3} />
          </div>
        </details>
      )}
    </>
  )
}

export default MatchingDetail
