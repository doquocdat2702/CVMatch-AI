import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getJobApplications, getMyJobsApplications, updateApplicationStatus } from '../../api/application.api'
import { getMyJobs } from '../../api/job.api'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import Select from '../../components/common/Select'
import Table from '../../components/common/Table'
import CvViewButton from '../../components/cv/CvViewButton'
import CandidateMatrixModal from '../../components/matching/CandidateMatrixModal'
import { getErrorMessage } from '../../utils/apiError'
import { formatDate, formatNumber } from '../../utils/format'
import { APPLICATION_STATUS_LABEL } from '../../utils/labels'
import { PAGE_SIZE, paginate, readPage, withPage } from '../../utils/pagination'
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

// Lựa chọn đầu tiên của ô chọn tin (T35i): giá trị rỗng = không có ?jobId trên URL
const ALL_JOBS_OPTION = { value: '', label: 'Tất cả tin của tôi' }

// Đơn ứng tuyển vào tin của chính nhà tuyển dụng này.
// Tin, trạng thái lọc và trang nằm trên URL (?jobId=&status=&page=), tải lại trang vẫn giữ.
// Không có ?jobId (mặc định, T35i) = "Tất cả tin của tôi": GET /applications/mine, phân trang phía server,
// có thêm cột "Tin tuyển dụng". Chọn một tin: GET /applications/job/:id trả cả danh sách, phân trang phía client (D1)
function Applications() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams)

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
        if (!ignore) setJobsError(getErrorMessage(err, 'Không tải được danh sách tin tuyển dụng.'))
      })
      .finally(() => {
        if (!ignore) setJobsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [jobsReloadKey])

  // jobId trên URL phải là tin của mình, không thì xem tất cả tin; status sai thì coi như không lọc
  const paramJobId = searchParams.get('jobId')
  const selectedJob = jobs ? jobs.find((job) => String(job.id) === paramJobId) || null : null
  const jobId = selectedJob ? String(selectedJob.id) : ''
  const allJobs = !selectedJob
  const paramStatus = searchParams.get('status')
  const statusFilter = STATUSES.includes(paramStatus) ? paramStatus : ''
  // Chế độ tất cả tin phân trang phía server nên trang nằm trong khóa; chế độ một tin phân trang phía client
  const requestKey =
    jobs && jobs.length > 0 ? `${jobId || 'all'}:${statusFilter}:${allJobs ? page : ''}:${reloadKey}` : null

  // Một lần gọi API theo chế độ đang chọn (dùng cả khi tải lần đầu lẫn khi lấy lại sau đổi trạng thái)
  function fetchApplications() {
    const status = statusFilter || undefined
    return allJobs ? getMyJobsApplications({ status, page, limit: PAGE_SIZE }) : getJobApplications(jobId, { status })
  }

  useEffect(() => {
    if (!requestKey) return undefined
    let ignore = false
    fetchApplications()
      .then((response) => {
        if (!ignore) setResult({ key: requestKey, data: response.data, error: '' })
      })
      .catch((err) => {
        if (!ignore) {
          setResult({ key: requestKey, data: null, error: getErrorMessage(err, 'Không tải được đơn ứng tuyển.') })
        }
      })
    return () => {
      ignore = true
    }
    // fetchApplications chỉ đọc jobId, statusFilter, page: đều đã nằm trong requestKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  // Chế độ tất cả tin: trang trên URL vượt quá số trang thật (vd đơn vừa đổi trạng thái khi đang lọc) thì về trang cuối
  const serverPagination = allJobs && result.key === requestKey && result.data ? result.data.pagination : null
  useEffect(() => {
    if (serverPagination && serverPagination.totalPages > 0 && page > serverPagination.totalPages) {
      setSearchParams(withPage(searchParams, serverPagination.totalPages), { replace: true })
    }
  }, [serverPagination, page, searchParams, setSearchParams])

  function handleJobsRetry() {
    setJobsError('')
    setJobsLoading(true)
    setJobsReloadKey((key) => key + 1)
  }

  // Đổi tin hoặc trạng thái lọc: dựng lại URL chỉ gồm jobId, status nên ?page= bị bỏ, về trang 1.
  // jobId rỗng (Tất cả tin của tôi) thì bỏ hẳn ?jobId
  function updateParams(changes) {
    const next = { jobId, status: statusFilter, ...changes }
    // Bỏ tham số rỗng cho URL gọn
    const params = Object.fromEntries(Object.entries(next).filter(([, value]) => value))
    setNotice(null)
    setSearchParams(params, { replace: true })
  }

  function handlePageChange(nextPage) {
    setSearchParams(withPage(searchParams, nextPage))
    window.scrollTo(0, 0)
  }

  // Lấy lại danh sách sau khi đổi trạng thái (kể cả khi lỗi) để luôn khớp với backend
  async function refreshList() {
    try {
      const response = await fetchApplications()
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
      setNotice({ type: 'error', text: getErrorMessage(err, 'Chưa đổi được trạng thái đơn. Vui lòng thử lại.') })
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

  // Cột "Tin tuyển dụng" chỉ có ở chế độ tất cả tin: link tới trang sửa tin (mọi tin ở đây đều do chính HR đăng)
  const jobColumn = {
    key: 'job',
    title: 'Tin tuyển dụng',
    render: (application) => (
      <span className={styles.jobCell}>
        <Link className={styles.link} to={`/recruiter/jobs/${application.job.id}/edit`}>
          {application.job.title}
        </Link>
        {!application.job.isOpen && <span className={styles.muted}>Đã đóng</span>}
      </span>
    ),
  }

  const columns = [
    {
      key: 'candidate',
      title: 'Ứng viên',
      render: (application) => (
        <span className={styles.name}>{application.candidate.fullName || 'Chưa có họ tên'}</span>
      ),
    },
    ...(allJobs ? [jobColumn] : []),
    { key: 'appliedAt', title: 'Ngày ứng tuyển', render: (application) => formatDate(application.appliedAt) },
    {
      // CV ứng viên chọn gửi kèm đơn (T35g). Đơn cũ chưa lưu CV: CV hiện tại của ứng viên kèm ghi chú
      key: 'cv',
      title: 'CV',
      render: (application) => (
        <div className={styles.cvCell}>
          <CvViewButton cv={application.cv} />
          {application.cv && application.cvLegacy && (
            <span className={styles.cvLegacy}>Đang hiển thị CV hiện tại của ứng viên</span>
          )}
        </div>
      ),
    },
    {
      key: 'coverage',
      title: 'Tỉ lệ có bằng chứng',
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
            placeholder={locked ? 'Đã có kết quả' : 'Chuyển sang...'}
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
          Xem đối chiếu
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
        <p className={styles.emptyText}>Chưa có tin tuyển dụng nào.</p>
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
      // Tất cả tin: server đã cắt trang; một tin: cắt trang phía client
      const { pageItems, page: currentPage, totalPages } = allJobs
        ? {
            pageItems: result.data.items,
            page: Math.min(page, Math.max(1, result.data.pagination.totalPages)),
            totalPages: Math.max(1, result.data.pagination.totalPages),
          }
        : paginate(result.data.items, page)
      let emptyText = allJobs ? 'Các tin đã đăng chưa có đơn ứng tuyển nào.' : 'Tin này chưa có đơn ứng tuyển nào.'
      if (statusFilter) emptyText = `Không có đơn nào ở trạng thái "${statusLabel(statusFilter)}".`
      list = (
        <>
          <Table columns={columns} data={pageItems} emptyText={emptyText} />
          <div className={styles.pagination}>
            <Pagination page={currentPage} totalPages={totalPages} onChange={handlePageChange} />
          </div>
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
            options={[ALL_JOBS_OPTION, ...jobs.map((job) => ({ value: String(job.id), label: jobOptionLabel(job) }))]}
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
        Đơn đi theo thứ tự Đã ứng tuyển, Đang xem xét, rồi Đã chấp nhận hoặc Đã từ chối. Đơn đã có kết quả thì không đổi
        được nữa. Ứng viên nhận thông báo sau mỗi lần đổi.
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

      {/* Chế độ tất cả tin: tên tin lấy từ chính dòng (application.job); modal mở theo applicationId
          nên luôn đối chiếu đúng tin của dòng */}
      {matrixTarget && (
        <CandidateMatrixModal
          title={`Đối chiếu: ${matrixTarget.candidate.fullName || 'Ứng viên'} - ${
            matrixTarget.job ? matrixTarget.job.title : selectedJob ? selectedJob.title : ''
          }`}
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
            {statusLabel(confirm.application.status)}" sang "{statusLabel(confirm.status)}". Đây là kết quả cuối, không
            đổi lại được. Ứng viên sẽ nhận thông báo.
          </p>
        )}
      </Modal>
    </>
  )
}

export default Applications
