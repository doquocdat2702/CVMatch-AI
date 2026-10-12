import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMyProfile } from '../../api/candidate.api'
import { getJobDetail } from '../../api/job.api'
import { getMatchingDetail } from '../../api/matching.api'
import ApplyAction from '../../components/application/ApplyAction'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import RequirementEvidenceMatrix from '../../components/matching/RequirementEvidenceMatrix'
import { getErrorMessage } from '../../utils/apiError'
import styles from './MatchingDetail.module.css'

// Lấy cùng lúc hồ sơ (để biết mã ứng viên) và chi tiết job, xong mới gọi ma trận đối chiếu.
// Đơn đã nộp do ApplyAction tự kiểm tra.
async function loadDetail(jobId) {
  const [profileResult, jobResult] = await Promise.all([getMyProfile(), getJobDetail(jobId)])
  const matchingResult = await getMatchingDetail(jobId, profileResult.data.id)
  return { job: jobResult.data, matching: matchingResult.data }
}

function MatchingDetail() {
  const { jobId } = useParams()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

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

  const { job, matching } = detail
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

        {/* Khối Ứng tuyển dùng chung với trang Chi tiết công việc */}
        <ApplyAction jobId={job.id} isOpen={job.isOpen} />
      </div>

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
