import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getJobDetail } from '../../api/job.api'
import ApplyAction from '../../components/application/ApplyAction'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/apiError'
import { formatDate } from '../../utils/format'
import { ROLES } from '../../utils/roles'
import styles from './JobDetail.module.css'

// Chi tiết công việc, route công khai /jobs/:id. Nút hiện theo người xem:
//   - Chưa đăng nhập: "Ứng tuyển" chuyển sang /login, đăng nhập xong quay lại đúng job này
//   - Ứng viên: khối Ứng tuyển dùng chung (ApplyAction) + "Xem đối chiếu với CV của tôi"
//   - Nhà tuyển dụng, quản trị viên: không có nút nào
function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuth()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

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

  function handleRetry() {
    setError('')
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  // Chưa đăng nhập: gửi kèm đường dẫn job để trang đăng nhập đưa người dùng quay lại
  function handleGuestApply() {
    navigate('/login', { state: { from: `/jobs/${id}` } })
  }

  const backLink = (
    <Link className={styles.backLink} to="/">
      Quay lại danh sách việc làm
    </Link>
  )

  if (loading) {
    return <Loading text="Đang tải tin tuyển dụng..." />
  }

  if (error) {
    return (
      <>
        {backLink}
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

  const isCandidate = isAuthenticated && role === ROLES.CANDIDATE

  let actions = null
  if (!isAuthenticated) {
    actions = job.isOpen ? <Button onClick={handleGuestApply}>Ứng tuyển</Button> : null
  } else if (isCandidate) {
    actions = (
      <>
        <ApplyAction jobId={job.id} isOpen={job.isOpen} />
        <Link className={styles.secondaryButton} to={`/candidate/recommended-jobs/${job.id}`}>
          Xem đối chiếu với CV của tôi
        </Link>
      </>
    )
  }

  return (
    <>
      {backLink}

      <header className={styles.header}>
        <h1 className={styles.title}>{job.title}</h1>
        {job.company && <p className={styles.company}>{job.company.name}</p>}
        {job.location && <p className={styles.meta}>{job.location}</p>}
        <p className={styles.meta}>Đăng ngày {formatDate(job.createdAt)}</p>
        {!job.isOpen && (
          <span className={styles.closed}>
            <Badge status="CLOSED">Vị trí đã đóng</Badge>
          </span>
        )}
      </header>

      {actions && <div className={styles.actions}>{actions}</div>}

      <section className={styles.section}>
        <h2>Mô tả công việc</h2>
        <p className={styles.description}>{job.description}</p>
      </section>
    </>
  )
}

export default JobDetail
