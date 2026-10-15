import { useEffect, useState } from 'react'
import { getApplicationDetail } from '../../api/application.api'
import { getMatchingDetail } from '../../api/matching.api'
import { getErrorMessage } from '../../utils/apiError'
import { formatNumber } from '../../utils/format'
import Button from '../common/Button'
import Loading from '../common/Loading'
import Modal from '../common/Modal'
import RequirementEvidenceMatrix from './RequirementEvidenceMatrix'
import styles from './CandidateMatrixModal.module.css'

// "x/y yêu cầu có bằng chứng (z%)"; job chưa có yêu cầu thì nói rõ thay vì "0/0 (0%)"
function formatCoverage(supported, total, coverage) {
  if (!total) return 'Tin chưa có yêu cầu để đối chiếu'
  return `${supported}/${total} yêu cầu có bằng chứng (${formatNumber(coverage)}%)`
}

// Modal ma trận của một ứng viên với một tin, dùng cho các trang nhà tuyển dụng (T34).
// Lấy dữ liệu theo một trong hai cách:
//   - applicationId: chi tiết đơn ứng tuyển, có thêm coverage lúc nộp
//   - jobId + candidateId: đối chiếu trực tiếp (ứng viên gợi ý, chưa nộp đơn)
// Chỉ render khi đang mở ({target && <CandidateMatrixModal />}), mỗi lần mở là tải lại từ đầu.
function CandidateMatrixModal({ title, applicationId, jobId, candidateId, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    const request = applicationId ? getApplicationDetail(applicationId) : getMatchingDetail(jobId, candidateId)
    request
      .then((result) => {
        if (!ignore) setDetail(result.data)
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, 'Không tải được ma trận đối chiếu'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [applicationId, jobId, candidateId])

  const fromApplication = Boolean(applicationId)

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={title}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      {loading && <Loading text="Đang đối chiếu..." />}
      {!loading && error && (
        <p className={styles.alertError} role="alert">
          {error}
        </p>
      )}
      {!loading && detail && (
        <div className={styles.body}>
          <div className={styles.summary}>
            <p className={styles.coverage}>
              {fromApplication && 'Hiện tại: '}
              {formatCoverage(detail.supported, detail.total, detail.coverage)}
            </p>
            {fromApplication && (
              <>
                <p className={styles.muted}>
                  Lúc nộp:{' '}
                  {detail.coverageAtApply === null || detail.coverageAtApply === undefined
                    ? 'tin chưa có yêu cầu để đối chiếu'
                    : `${formatNumber(detail.coverageAtApply)}% yêu cầu có bằng chứng`}
                </p>
                <p className={styles.muted}>Ma trận tính lại theo hồ sơ hiện tại, nên có thể khác lúc nộp đơn.</p>
              </>
            )}
          </div>
          <RequirementEvidenceMatrix
            matrix={detail.matrix}
            note={detail.note}
            emptyText={detail.message || 'Tin tuyển dụng chưa có yêu cầu để đối chiếu'}
          />
        </div>
      )}
    </Modal>
  )
}

export default CandidateMatrixModal
