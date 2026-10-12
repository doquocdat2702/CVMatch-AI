import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { applyJob, getMyApplications } from '../../api/application.api'
import { getMyProfile } from '../../api/candidate.api'
import { getJobDetail } from '../../api/job.api'
import { getMatchingDetail } from '../../api/matching.api'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import RequirementEvidenceMatrix from '../../components/matching/RequirementEvidenceMatrix'
import { getErrorMessage } from '../../utils/apiError'
import { formatDateTime } from '../../utils/format'
import { APPLICATION_STATUS_LABEL } from '../../utils/labels'
import styles from './MatchingDetail.module.css'

// Lấy cùng lúc: hồ sơ (để biết mã ứng viên), chi tiết job, đơn đã nộp; xong mới gọi ma trận đối chiếu
async function loadDetail(jobId) {
  const [profileResult, jobResult, applicationsResult] = await Promise.all([
    getMyProfile(),
    getJobDetail(jobId),
    getMyApplications(),
  ])
  const matchingResult = await getMatchingDetail(jobId, profileResult.data.id)
  const job = jobResult.data
  return {
    job,
    matching: matchingResult.data,
    // Đơn của ứng viên cho đúng job này (nếu đã ứng tuyển)
    application: applicationsResult.data.items.find((item) => item.job.id === job.id) || null,
  }
}

function MatchingDetail() {
  const { jobId } = useParams()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applied, setApplied] = useState(false)

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

  async function handleApply() {
    setApplyError('')
    setApplying(true)
    try {
      const result = await applyJob(detail.job.id)
      // Đơn vừa tạo (status APPLIED): nút Ứng tuyển chuyển thành trạng thái đơn
      setDetail((prev) => ({ ...prev, application: result.data }))
      setApplied(true)
    } catch (err) {
      // Vd chưa có CV đã phân tích, job vừa đóng, đã ứng tuyển ở tab khác
      setApplyError(getErrorMessage(err, 'Ứng tuyển thất bại, vui lòng thử lại'))
    } finally {
      setApplying(false)
    }
  }

  const backLink = (
    <Link className={styles.backLink} to="/candidate/recommended-jobs">
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

  const { job, matching, application } = detail
  const companyName = job.company ? job.company.name : ''

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

        <div className={styles.applyBox}>
          {application ? (
            // Đã ứng tuyển: thay nút bằng trạng thái đơn hiện tại
            <>
              <p className={styles.applyLabel}>Trạng thái đơn của bạn</p>
              <Badge status={application.status}>
                {APPLICATION_STATUS_LABEL[application.status] || application.status}
              </Badge>
              <p className={styles.applyMeta}>Nộp lúc {formatDateTime(application.appliedAt)}</p>
            </>
          ) : (
            <Button onClick={handleApply} loading={applying} disabled={!job.isOpen}>
              {applying ? 'Đang nộp đơn...' : 'Ứng tuyển'}
            </Button>
          )}
        </div>
      </div>

      {applied && (
        <p className={styles.alertSuccess} role="status">
          Đã nộp đơn ứng tuyển.
        </p>
      )}
      {applyError && (
        <p className={styles.alertError} role="alert">
          {applyError}
        </p>
      )}

      <section className={styles.section}>
        <h2>Đối chiếu yêu cầu với hồ sơ</h2>
        <RequirementEvidenceMatrix
          matrix={matching.matrix}
          note={matching.note}
          emptyText={matching.message || 'Tin tuyển dụng chưa có yêu cầu để đối chiếu'}
        />
      </section>

      {job.description && (
        <details className={styles.description}>
          <summary className={styles.descriptionToggle}>Mô tả công việc</summary>
          <p className={styles.descriptionText}>{job.description}</p>
        </details>
      )}
    </>
  )
}

export default MatchingDetail
