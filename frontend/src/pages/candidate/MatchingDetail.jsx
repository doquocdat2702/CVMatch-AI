import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMyProfile } from '../../api/candidate.api'
import { getJobDetail } from '../../api/job.api'
import { getMatchingDetail } from '../../api/matching.api'
import ApplyAction from '../../components/application/ApplyAction'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import RequirementEvidenceMatrix from '../../components/matching/RequirementEvidenceMatrix'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getErrorMessage } from '../../utils/apiError'
import { MATCH_STATUS_LABEL } from '../../utils/labels'
import styles from './MatchingDetail.module.css'

// Chú thích 3 trạng thái (T35g), viết theo đúng quy tắc của backend:
// matcher.js resolveEvidence + evidence.finder.js (matchOneSkill, findExperienceEvidence, findEducationEvidence,
// checkYearsRequirement). EXACT -> Có bằng chứng, PARTIAL -> Chưa chắc chắn, NONE -> Không tìm thấy
const STATUS_RULES = [
  {
    status: 'SUPPORTED',
    text:
      'Hồ sơ có đúng kỹ năng, hoặc có trường, ngành, bằng cấp trùng với yêu cầu. ' +
      'Nếu yêu cầu có số năm, kinh nghiệm liên quan phải đủ số năm đó.',
  },
  {
    status: 'UNCERTAIN',
    text:
      'Hồ sơ có dấu hiệu liên quan nhưng chưa khớp trực tiếp, ví dụ kỹ năng ghi bằng tên khác, chỉ nhắc trong phần ' +
      'kinh nghiệm, hoặc kinh nghiệm chưa đủ số năm.',
  },
  {
    status: 'NOT_FOUND',
    text:
      'Hồ sơ không có kỹ năng, kinh nghiệm hay học vấn nào nhắc tới yêu cầu này. ' +
      'Hai kỹ năng khác nhau như Java và JavaScript không được tính là khớp.',
  },
]

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

      <section className={styles.section}>
        <h2>Đối chiếu yêu cầu với hồ sơ</h2>
        <dl className={styles.statusLegend} aria-label="Cách hiểu 3 trạng thái đối chiếu">
          {STATUS_RULES.map((rule) => (
            <div key={rule.status} className={styles.legendRow}>
              <dt className={styles.legendTerm}>
                <Badge status={rule.status}>{MATCH_STATUS_LABEL[rule.status]}</Badge>
              </dt>
              <dd className={styles.legendText}>{rule.text}</dd>
            </div>
          ))}
        </dl>
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
