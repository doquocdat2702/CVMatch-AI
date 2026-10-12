import { useEffect, useState } from 'react'
import { applyJob, getMyApplications } from '../../api/application.api'
import { getErrorMessage } from '../../utils/apiError'
import { formatDateTime } from '../../utils/format'
import { APPLICATION_STATUS_LABEL } from '../../utils/labels'
import Badge from '../common/Badge'
import Button from '../common/Button'
import styles from './ApplyAction.module.css'

// Khối Ứng tuyển dùng chung cho trang Chi tiết công việc (T31) và Chi tiết đối chiếu (T30).
// Chỉ dùng khi người xem là ứng viên đã đăng nhập (getMyApplications cần quyền CANDIDATE).
//   - Đã nộp đơn cho job này: nút "Đã ứng tuyển" bị khóa, kèm trạng thái đơn hiện tại
//   - Chưa nộp, job đang mở: nút "Ứng tuyển"
//   - Chưa nộp, job đã đóng: không hiện gì (trang tự hiện nhãn đóng)
function ApplyAction({ jobId, isOpen }) {
  const [application, setApplication] = useState(null)
  const [checking, setChecking] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [justApplied, setJustApplied] = useState(false)

  // Tìm đơn của ứng viên cho đúng job này
  useEffect(() => {
    let ignore = false
    getMyApplications()
      .then((result) => {
        if (!ignore) setApplication(result.data.items.find((item) => item.job.id === Number(jobId)) || null)
      })
      .catch(() => {
        // Không kiểm tra được thì vẫn cho bấm: backend chặn nộp trùng và báo lại
      })
      .finally(() => {
        if (!ignore) setChecking(false)
      })
    return () => {
      ignore = true
    }
  }, [jobId])

  async function handleApply() {
    setError('')
    setApplying(true)
    try {
      const result = await applyJob(Number(jobId))
      // Đơn vừa tạo (status APPLIED): nút chuyển thành "Đã ứng tuyển"
      setApplication(result.data)
      setJustApplied(true)
    } catch (err) {
      // Vd chưa có CV đã phân tích, job vừa đóng, đã ứng tuyển ở tab khác
      setError(getErrorMessage(err, 'Ứng tuyển thất bại, vui lòng thử lại'))
    } finally {
      setApplying(false)
    }
  }

  // Đang kiểm tra đơn: chưa hiện gì để nút không nháy từ "Ứng tuyển" sang "Đã ứng tuyển"
  if (checking) return null

  if (application) {
    return (
      <div className={styles.box}>
        <Button disabled>Đã ứng tuyển</Button>
        <p className={styles.status}>
          Trạng thái đơn:{' '}
          <Badge status={application.status}>
            {APPLICATION_STATUS_LABEL[application.status] || application.status}
          </Badge>
        </p>
        <p className={styles.meta}>Nộp lúc {formatDateTime(application.appliedAt)}</p>
        {justApplied && (
          <p className={styles.success} role="status">
            Đã nộp đơn ứng tuyển.
          </p>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className={styles.box}>
      <Button onClick={handleApply} loading={applying}>
        {applying ? 'Đang nộp đơn...' : 'Ứng tuyển'}
      </Button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default ApplyAction
