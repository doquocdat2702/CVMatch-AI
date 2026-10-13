import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { closeJob, deleteJob, getMyJobs } from '../../api/job.api'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import Table from '../../components/common/Table'
import { getErrorMessage } from '../../utils/apiError'
import styles from './JobList.module.css'

// Nội dung hộp thoại xác nhận cho từng thao tác
const CONFIRM = {
  close: {
    title: 'Đóng tin tuyển dụng',
    text: (job) => `Đóng tin "${job.title}"? Tin sẽ ngừng nhận đơn và không mở lại được. Các đơn đã nhận vẫn được giữ.`,
    button: 'Đóng tin',
    pending: 'Đang đóng tin...',
    done: (job) => `Đã đóng tin "${job.title}".`,
    run: closeJob,
  },
  delete: {
    title: 'Xóa tin tuyển dụng',
    text: (job) => `Xóa tin "${job.title}" cùng các yêu cầu đã phân tích? Thao tác này không hoàn tác được.`,
    button: 'Xóa tin',
    pending: 'Đang xóa...',
    done: (job) => `Đã xóa tin "${job.title}".`,
    run: deleteJob,
  },
}

// Tin do chính nhà tuyển dụng này đăng (GET /jobs/my). Sửa, đóng, xóa chỉ áp dụng cho tin của mình
// (HR xem chung, sửa riêng): tin của đồng nghiệp xem ở bảng tin chung.
function JobList() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState(null)

  // Hộp thoại xác nhận: { action: 'close' | 'delete', job }
  const [confirm, setConfirm] = useState(null)
  const [running, setRunning] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  useEffect(() => {
    let ignore = false
    getMyJobs()
      .then((result) => {
        if (!ignore) setJobs(result.data)
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, 'Không tải được danh sách tin tuyển dụng'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [reloadKey])

  function handleRetry() {
    setError('')
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  async function refreshList() {
    try {
      const result = await getMyJobs()
      setJobs(result.data)
    } catch {
      // Giữ danh sách đang hiện, lần tải trang sau sẽ lấy lại
    }
  }

  function openConfirm(action, job) {
    setNotice(null)
    setConfirmError('')
    setConfirm({ action, job })
  }

  function closeConfirm() {
    if (!running) setConfirm(null)
  }

  async function handleConfirm() {
    const config = CONFIRM[confirm.action]
    setRunning(true)
    setConfirmError('')
    try {
      await config.run(confirm.job.id)
      setNotice(config.done(confirm.job))
      setConfirm(null)
    } catch (err) {
      // Vd tin vừa có đơn ứng tuyển nên không xóa được nữa
      setConfirmError(getErrorMessage(err, 'Thao tác thất bại, vui lòng thử lại'))
    } finally {
      setRunning(false)
      await refreshList()
    }
  }

  const columns = [
    {
      key: 'title',
      title: 'Tiêu đề',
      render: (job) => (
        // Xem tin như ứng viên thấy
        <Link className={styles.titleLink} to={`/jobs/${job.id}`}>
          {job.title}
        </Link>
      ),
    },
    {
      key: 'location',
      title: 'Địa điểm',
      render: (job) => job.location || <span className={styles.muted}>Chưa ghi</span>,
    },
    { key: 'applicationCount', title: 'Số đơn ứng tuyển', align: 'right' },
    {
      key: 'isOpen',
      title: 'Trạng thái',
      render: (job) =>
        job.isOpen ? <Badge status="OPEN">Đang mở</Badge> : <Badge status="CLOSED">Đã đóng</Badge>,
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      render: (job) => (
        <div className={styles.rowActions}>
          <Link className={styles.actionLink} to={`/recruiter/jobs/${job.id}/edit`}>
            Sửa
          </Link>
          {/* Không có API mở lại tin nên chỉ đóng được tin đang mở */}
          {job.isOpen && (
            <Button variant="ghost" size="sm" onClick={() => openConfirm('close', job)}>
              Đóng
            </Button>
          )}
          {/* Backend chặn xóa tin đã có đơn: tin đó chỉ đóng được */}
          {job.applicationCount === 0 && (
            <Button variant="ghost" size="sm" onClick={() => openConfirm('delete', job)}>
              Xóa
            </Button>
          )}
        </div>
      ),
    },
  ]

  const confirmConfig = confirm ? CONFIRM[confirm.action] : null

  let content
  if (loading) {
    content = <Loading text="Đang tải tin tuyển dụng..." />
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
  } else if (jobs.length === 0) {
    content = (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Bạn chưa đăng tin tuyển dụng nào.</p>
        <Link className={styles.primaryLink} to="/recruiter/jobs/new">
          Tạo tin mới
        </Link>
      </div>
    )
  } else {
    content = (
      <>
        <Table columns={columns} data={jobs} />
        <p className={styles.note}>Tin đã có đơn ứng tuyển không xóa được, chỉ đóng được.</p>
      </>
    )
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Tin tuyển dụng</h1>
        <Link className={styles.primaryLink} to="/recruiter/jobs/new">
          Tạo tin mới
        </Link>
      </div>
      <p className={styles.intro}>Các tin do bạn đăng. Tin của đồng nghiệp xem ở bảng tin việc làm chung.</p>

      {notice && (
        <p className={styles.alertSuccess} role="status">
          {notice}
        </p>
      )}

      {content}

      <Modal
        open={confirm !== null}
        onClose={closeConfirm}
        title={confirmConfig ? confirmConfig.title : ''}
        footer={
          <>
            <Button variant="secondary" onClick={closeConfirm} disabled={running}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleConfirm} loading={running}>
              {running ? confirmConfig && confirmConfig.pending : confirmConfig && confirmConfig.button}
            </Button>
          </>
        }
      >
        <p className={styles.modalText}>{confirmConfig ? confirmConfig.text(confirm.job) : ''}</p>
        {confirmError && (
          <p className={styles.alertError} role="alert">
            {confirmError}
          </p>
        )}
      </Modal>
    </>
  )
}

export default JobList
