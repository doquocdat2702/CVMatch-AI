import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { closeJob, deleteJob, getMyJobs } from '../../api/job.api'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import Select from '../../components/common/Select'
import Table from '../../components/common/Table'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/apiError'
import { paginate, readPage, withPage } from '../../utils/pagination'
import { ROLES } from '../../utils/roles'
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

// Lọc trạng thái (chỉ trang admin): ?status=open | closed, không có = tất cả
const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'open', label: 'Đang mở' },
  { value: 'closed', label: 'Đã đóng' },
]

// Tin do chính nhà tuyển dụng này đăng (GET /jobs/my). Sửa, đóng, xóa chỉ áp dụng cho tin của mình
// (HR xem chung, sửa riêng): tin của đồng nghiệp xem ở bảng tin chung.
// Dùng lại cho /admin/jobs (QA3): GET /jobs/my của ADMIN trả mọi tin của mọi HR; trang admin có thêm cột
// Người đăng và lọc trạng thái, không có nút tạo tin (tin do HR đăng), sửa tin mở trang /admin/jobs/:id/edit
function JobList() {
  const { role } = useAuth()
  const isAdmin = role === ROLES.ADMIN
  const basePath = isAdmin ? '/admin/jobs' : '/recruiter/jobs'
  // GET /jobs/my trả cả danh sách: phân trang phía client, trang hiện tại trên URL (?page=)
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams)
  const statusParam = searchParams.get('status')
  const statusFilter = isAdmin && (statusParam === 'open' || statusParam === 'closed') ? statusParam : ''
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
        if (!ignore) setError(getErrorMessage(err, 'Không tải được danh sách tin tuyển dụng.'))
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

  function handlePageChange(nextPage) {
    setSearchParams(withPage(searchParams, nextPage))
    window.scrollTo(0, 0)
  }

  // Đổi bộ lọc: về trang 1, thêm mục lịch sử để Back bỏ bộ lọc vừa chọn (như QA-14)
  function handleStatusChange(event) {
    const value = event.target.value
    setNotice(null)
    setSearchParams(value ? { status: value } : {})
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
      setConfirmError(getErrorMessage(err, 'Chưa thực hiện được. Vui lòng thử lại.'))
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
        // Khung có độ rộng tối thiểu: màn hình hẹp không bẻ tiêu đề thành từng mẩu chữ.
        // Link xem tin như ứng viên thấy
        <div className={styles.titleCell}>
          <Link className={styles.titleLink} to={`/jobs/${job.id}`}>
            {job.title}
          </Link>
        </div>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'recruiter',
            title: 'Người đăng',
            render: (job) => (job.recruiterProfile ? job.recruiterProfile.fullName : <span className={styles.muted}>Chưa có</span>),
          },
        ]
      : []),
    {
      key: 'location',
      title: 'Địa điểm',
      render: (job) => job.location || <span className={styles.muted}>Chưa có</span>,
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
          <Link className={styles.actionLink} to={`${basePath}/${job.id}/edit`}>
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
        <p className={styles.emptyText}>Chưa có tin tuyển dụng nào.</p>
        {!isAdmin && (
          <Link className={styles.primaryLink} to="/recruiter/jobs/new">
            Tạo tin mới
          </Link>
        )}
      </div>
    )
  } else {
    const shownJobs = statusFilter ? jobs.filter((job) => job.isOpen === (statusFilter === 'open')) : jobs
    const { pageItems, page: currentPage, totalPages } = paginate(shownJobs, page)
    content = (
      <>
        {isAdmin && (
          <div className={styles.filters}>
            <Select label="Lọc theo trạng thái" name="status" options={STATUS_OPTIONS} value={statusFilter} onChange={handleStatusChange} />
          </div>
        )}
        {shownJobs.length === 0 ? (
          <p className={styles.emptyText}>Không có tin tuyển dụng nào ở trạng thái này.</p>
        ) : (
          <Table columns={columns} data={pageItems} />
        )}
        <div className={styles.pagination}>
          <Pagination page={currentPage} totalPages={totalPages} onChange={handlePageChange} />
        </div>
        <p className={styles.note}>Tin đã có đơn ứng tuyển không xóa được, chỉ đóng được.</p>
      </>
    )
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Tin tuyển dụng</h1>
        {!isAdmin && (
          <Link className={styles.primaryLink} to="/recruiter/jobs/new">
            Tạo tin mới
          </Link>
        )}
      </div>
      <p className={styles.intro}>
        {isAdmin
          ? 'Tin tuyển dụng của mọi nhà tuyển dụng. Tin mới do nhà tuyển dụng đăng.'
          : 'Tin tuyển dụng do tài khoản này đăng. Tin của nhà tuyển dụng khác xem ở trang Việc làm.'}
      </p>

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
