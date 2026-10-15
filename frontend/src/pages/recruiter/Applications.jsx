import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getJobApplications, updateApplicationStatus } from '../../api/application.api'
import { getMyJobs } from '../../api/job.api'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import Select from '../../components/common/Select'
import Table from '../../components/common/Table'
import CandidateMatrixModal from '../../components/matching/CandidateMatrixModal'
import { getErrorMessage } from '../../utils/apiError'
import { formatDate, formatNumber } from '../../utils/format'
import { APPLICATION_STATUS_LABEL } from '../../utils/labels'
import styles from './Applications.module.css'

const STATUSES = ['APPLIED', 'REVIEWING', 'ACCEPTED', 'REJECTED']

// Khớp STATUS_TRANSITIONS của backend: Đã nộp -> Đang xem xét -> Đã chấp nhận | Đã từ chối,
// Đã nộp -> Đã từ chối. Đã chấp nhận, Đã từ chối là trạng thái cuối.
const STATUS_TRANSITIONS = {
  APPLIED: ['REVIEWING', 'REJECTED'],
  REVIEWING: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  REJECTED: [],
}

// Chuyển sang trạng thái cuối thì không đổi lại được: hỏi xác nhận trước
const FINAL_STATUSES = ['ACCEPTED', 'REJECTED']

const FILTER_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  ...STATUSES.map((status) => ({ value: status, label: APPLICATION_STATUS_LABEL[status] })),
]

function statusLabel(status) {
  return APPLICATION_STATUS_LABEL[status] || status
}

function jobOptionLabel(job) {
  return job.isOpen ? job.title : `${job.title} (đã đóng)`
}

// Đơn ứng tuyển vào tin của chính nhà tuyển dụng này.
// Tin và trạng thái lọc nằm trên URL (?jobId=&status=), tải lại trang vẫn giữ.
function Applications() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [jobs, setJobs] = useState(null)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsError, setJobsError] = useState('')
  const [jobsReloadKey, setJobsReloadKey] = useState(0)

  // Kết quả gắn với khóa của lần gọi (tin + trạng thái lọc + lần thử lại): khóa khác khóa hiện tại nghĩa là đang tải
  const [result, setResult] = useState({ key: null, data: null, error: '' })
  const [reloadKey, setReloadKey] = useState(0)

  // { type: 'success' | 'error', text }
  const [notice, setNotice] = useState(null)
  // Đơn đang gửi yêu cầu đổi trạng thái
  const [updatingId, setUpdatingId] = useState(null)
  // Chờ xác nhận chuyển sang trạng thái cuối: { application, status }
  const [confirm, setConfirm] = useState(null)
  const [matrixTarget, setMatrixTarget] = useState(null)

  useEffect(() => {
    let ignore = false
    getMyJobs()
      .then((response) => {
        if (!ignore) setJobs(response.data)
      })
      .catch((err) => {
        if (!ignore) setJobsError(getErrorMessage(err, 'Không tải được danh sách tin tuyển dụng'))
      })
      .finally(() => {
        if (!ignore) setJobsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [jobsReloadKey])

  // jobId trên URL phải là tin của mình, không thì dùng tin đầu tiên; status sai thì coi như không lọc
  const paramJobId = searchParams.get('jobId')
  const selectedJob = jobs ? jobs.find((job) => String(job.id) === paramJobId) || jobs[0] || null : null
  const jobId = selectedJob ? String(selectedJob.id) : ''
  const paramStatus = searchParams.get('status')
  const statusFilter = STATUSES.includes(paramStatus) ? paramStatus : ''
  const requestKey = jobId ? `${jobId}:${statusFilter}:${reloadKey}` : null

  useEffect(() => {
    if (!requestKey) return undefined
    let ignore = false
    getJobApplications(jobId, { status: statusFilter || undefined })
      .then((response) => {
        if (!ignore) setResult({ key: requestKey, data: response.data, error: '' })
      })
      .catch((err) => {
        if (!ignore) {
          setResult({ key: requestKey, data: null, error: getErrorMessage(err, 'Không tải được đơn ứng tuyển') })
        }
      })
    return () => {
      ignore = true
    }
  }, [jobId, statusFilter, requestKey])

  function handleJobsRetry() {
    setJobsError('')
    setJobsLoading(true)
    setJobsReloadKey((key) => key + 1)
  }

  function updateParams(changes) {
    const next = { jobId, status: statusFilter, ...changes }
    // Bỏ tham số rỗng cho URL gọn
    const params = Object.fromEntries(Object.entries(next).filter(([, value]) => value))
    setNotice(null)
    setSearchParams(params, { replace: true })
  }

  // Lấy lại danh sách sau khi đổi trạng thái (kể cả khi lỗi) để luôn khớp với backend
  async function refreshList() {
    try {
      const response = await getJobApplications(jobId, { status: statusFilter || undefined })
      setResult({ key: requestKey, data: response.data, error: '' })
    } catch {
      // Giữ danh sách đang hiện, lần tải trang sau sẽ lấy lại
    }
  }

  // ===== Đổi trạng thái =====

  function handleStatusSelect(application, status) {
    if (!status) return
    setNotice(null)
    if (FINAL_STATUSES.includes(status)) {
      setConfirm({ application, status })
      return
    }
    changeStatus(application, status)
  }

  async function changeStatus(application, status) {
    setUpdatingId(application.id)
    try {
      await updateApplicationStatus(application.id, status)
      setNotice({
        type: 'success',
        text: `Đã chuyển đơn của ${application.candidate.fullName || 'ứng viên'} sang "${statusLabel(status)}". Ứng viên sẽ nhận được thông báo.`,
      })
    } catch (err) {
      // Hiện đúng câu lỗi của API (vd đơn vừa bị đổi trạng thái, không phải tin của mình)
      setNotice({ type: 'error', text: getErrorMessage(err, 'Đổi trạng thái đơn thất bại, vui lòng thử lại') })
    } finally {
      await refreshList()
      setUpdatingId(null)
    }
  }

  function handleConfirm() {
    const { application, status } = confirm
    setConfirm(null)
    changeStatus(application, status)
  }

  // ===== Bảng =====

  const columns = [
    {
      key: 'candidate',
      title: 'Ứng viên',
      render: (application) => (
        <span className={styles.name}>{application.candidate.fullName || 'Chưa có họ tên'}</span>
      ),
    },
    { key: 'appliedAt', title: 'Ngày nộp', render: (application) => formatDate(application.appliedAt) },
    {
      key: 'coverage',
      title: 'Coverage lúc nộp',
      align: 'right',
      // Backend chỉ lưu % lúc nộp (không lưu số yêu cầu), xem đủ "x/y" trong ma trận
      render: (application) =>
        application.coverage === null || application.coverage === undefined ? (
          <span className={styles.muted}>Chưa có yêu cầu</span>
        ) : (
          `${formatNumber(application.coverage)}%`
        ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (application) => <Badge status={application.status}>{statusLabel(application.status)}</Badge>,
    },
    {
      key: 'changeStatus',
      title: 'Đổi trạng thái',
      render: (application) => {
        const allowed = STATUS_TRANSITIONS[application.status] || []
        const locked = allowed.length === 0
        // value luôn rỗng: trạng thái thật ở cột Trạng thái, dropdown chỉ để chọn bước tiếp theo
        return (
          <Select
            aria-label={`Đổi trạng thái đơn của ${application.candidate.fullName || 'ứng viên'}`}
            placeholder={locked ? 'Đã chốt, không đổi được' : 'Chuyển sang...'}
            options={allowed.map((status) => ({ value: status, label: statusLabel(status) }))}
            value=""
            onChange={(event) => handleStatusSelect(application, event.target.value)}
            disabled={locked || updatingId !== null}
            className={styles.statusSelect}
          />
        )
      },
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      render: (application) => (
        <Button variant="ghost" size="sm" onClick={() => setMatrixTarget(application)}>
          Xem ma trận
        </Button>
      ),
    },
  ]

  let content
  if (jobsLoading) {
    content = <Loading text="Đang tải tin tuyển dụng..." />
  } else if (jobsError) {
    content = (
      <>
        <p className={styles.alertError} role="alert">
          {jobsError}
        </p>
        <Button variant="secondary" onClick={handleJobsRetry}>
          Thử lại
        </Button>
      </>
    )
  } else if (jobs.length === 0) {
    content = (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Bạn chưa đăng tin tuyển dụng nào.</p>
        <Link className={styles.link} to="/recruiter/jobs/new">
          Đăng tin tuyển dụng
        </Link>
      </div>
    )
  } else {
    let list
    if (result.key !== requestKey) {
      list = <Loading text="Đang tải đơn ứng tuyển..." />
    } else if (result.error) {
      list = (
        <>
          <p className={styles.alertError} role="alert">
            {result.error}
          </p>
          <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
            Thử lại
          </Button>
        </>
      )
    } else {
      list = (
        <>
          <Table
            columns={columns}
            data={result.data.items}
            emptyText={
              statusFilter
                ? `Không có đơn nào ở trạng thái "${statusLabel(statusFilter)}".`
                : 'Tin này chưa có đơn ứng tuyển nào.'
            }
          />
          {/* Coverage chỉ là chỉ số đối chiếu, luôn kèm câu nhắc của API */}
          {result.data.note && <p className={styles.note}>{result.data.note}</p>}
        </>
      )
    }

    content = (
      <>
        <div className={styles.filters}>
          <Select
            label="Tin tuyển dụng"
            name="jobId"
            options={jobs.map((job) => ({ value: String(job.id), label: jobOptionLabel(job) }))}
            value={jobId}
            onChange={(event) => updateParams({ jobId: event.target.value })}
            disabled={updatingId !== null}
          />
          <Select
            label="Lọc theo trạng thái"
            name="status"
            options={FILTER_OPTIONS}
            value={statusFilter}
            onChange={(event) => updateParams({ status: event.target.value })}
            disabled={updatingId !== null}
          />
        </div>
        {list}
      </>
    )
  }

  return (
    <>
      <h1>Đơn ứng tuyển</h1>
      <p className={styles.intro}>
        Đơn đi theo luồng: Đã nộp, Đang xem xét, rồi Đã chấp nhận hoặc Đã từ chối (có thể từ chối ngay khi mới nộp). Đơn
        đã chấp nhận hoặc từ chối thì không đổi được nữa. Mỗi lần đổi, ứng viên nhận được thông báo.
      </p>

      {notice && (
        <p
          className={notice.type === 'error' ? styles.alertError : styles.alertSuccess}
          role={notice.type === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}

      {content}

      {matrixTarget && (
        <CandidateMatrixModal
          title={`Đối chiếu: ${matrixTarget.candidate.fullName || 'Ứng viên'} - ${selectedJob ? selectedJob.title : ''}`}
          applicationId={matrixTarget.id}
          onClose={() => setMatrixTarget(null)}
        />
      )}

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm ? `Chuyển đơn sang "${statusLabel(confirm.status)}"?` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Hủy
            </Button>
            <Button variant={confirm && confirm.status === 'REJECTED' ? 'danger' : 'primary'} onClick={handleConfirm}>
              Xác nhận
            </Button>
          </>
        }
      >
        {confirm && (
          <p className={styles.modalText}>
            Đơn của {confirm.application.candidate.fullName || 'ứng viên'} sẽ chuyển từ "
            {statusLabel(confirm.application.status)}" sang "{statusLabel(confirm.status)}". Đây là trạng thái cuối,
            không đổi lại được, và ứng viên sẽ nhận được thông báo.
          </p>
        )}
      </Modal>
    </>
  )
}

export default Applications
