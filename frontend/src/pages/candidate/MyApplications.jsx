import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApplicationDetail, getMyApplications, withdrawApplication } from '../../api/application.api'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import Select from '../../components/common/Select'
import Table from '../../components/common/Table'
import RequirementEvidenceMatrix from '../../components/matching/RequirementEvidenceMatrix'
import { getErrorMessage } from '../../utils/apiError'
import { formatDate, formatNumber } from '../../utils/format'
import { APPLICATION_STATUS_LABEL } from '../../utils/labels'
import styles from './MyApplications.module.css'

const STATUSES = ['APPLIED', 'REVIEWING', 'ACCEPTED', 'REJECTED']

// "x/y yêu cầu có bằng chứng (z%)"; job chưa có yêu cầu thì nói rõ thay vì "0/0 (0%)"
function formatCoverage(supported, total, coverage) {
  if (!total) return 'Tin chưa có yêu cầu để đối chiếu'
  return `${supported}/${total} yêu cầu có bằng chứng (${formatNumber(coverage)}%)`
}

// Modal xem lại ma trận của một đơn. Chỉ được render khi đang mở, nên mỗi lần mở là tải lại từ đầu.
// Ma trận tính LẠI theo hồ sơ hiện tại; coverage lúc nộp là % backend đã lưu khi nộp đơn.
function MatrixModal({ application, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    getApplicationDetail(application.id)
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
  }, [application.id])

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`Đối chiếu: ${application.job.title}`}
      footer={
        <>
          <Link className={styles.footerLink} to={`/candidate/recommended-jobs/${application.job.id}`}>
            Mở trang chi tiết đối chiếu
          </Link>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </>
      }
    >
      {loading && <Loading text="Đang đối chiếu..." />}
      {!loading && error && (
        <p className={styles.alertError} role="alert">
          {error}
        </p>
      )}
      {!loading && detail && (
        <div className={styles.matrixBody}>
          <div className={styles.coverageSummary}>
            <p className={styles.coverageNow}>
              Hiện tại: {formatCoverage(detail.supported, detail.total, detail.coverage)}
            </p>
            <p className={styles.muted}>
              Lúc nộp:{' '}
              {detail.coverageAtApply === null || detail.coverageAtApply === undefined
                ? 'tin chưa có yêu cầu để đối chiếu'
                : `${formatNumber(detail.coverageAtApply)}% yêu cầu có bằng chứng`}
            </p>
            <p className={styles.muted}>
              Ma trận tính lại theo hồ sơ hiện tại của bạn, nên có thể khác lúc nộp đơn.
            </p>
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

function MyApplications() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // '' = tất cả trạng thái
  const [statusFilter, setStatusFilter] = useState('')
  const [notice, setNotice] = useState(null)

  // Đơn đang xem ma trận / đang chờ xác nhận rút
  const [matrixTarget, setMatrixTarget] = useState(null)
  const [withdrawTarget, setWithdrawTarget] = useState(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')

  useEffect(() => {
    let ignore = false
    getMyApplications()
      .then((result) => {
        if (!ignore) setData(result.data)
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, 'Không tải được danh sách đơn ứng tuyển'))
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

  // Lấy lại danh sách sau khi rút đơn để trạng thái luôn khớp với backend
  async function refreshList() {
    try {
      const result = await getMyApplications()
      setData(result.data)
    } catch {
      // Giữ danh sách đang hiện, lần tải trang sau sẽ lấy lại
    }
  }

  // ===== Rút đơn =====

  function openWithdraw(application) {
    setNotice(null)
    setWithdrawError('')
    setWithdrawTarget(application)
  }

  function closeWithdraw() {
    if (!withdrawing) setWithdrawTarget(null)
  }

  async function handleWithdraw() {
    setWithdrawing(true)
    setWithdrawError('')
    try {
      await withdrawApplication(withdrawTarget.id)
      setNotice({ type: 'success', text: `Đã rút đơn ứng tuyển vị trí "${withdrawTarget.job.title}".` })
      setWithdrawTarget(null)
    } catch (err) {
      // Vd nhà tuyển dụng vừa chuyển đơn sang "Đang xem xét": không rút được nữa
      setWithdrawError(getErrorMessage(err, 'Rút đơn thất bại, vui lòng thử lại'))
    } finally {
      setWithdrawing(false)
      await refreshList()
    }
  }

  // ===== Bảng =====

  const columns = [
    {
      key: 'job',
      title: 'Vị trí',
      render: (application) => (
        <Link className={styles.jobLink} to={`/jobs/${application.job.id}`}>
          {application.job.title}
        </Link>
      ),
    },
    { key: 'company', title: 'Công ty', render: (application) => application.job.companyName },
    { key: 'appliedAt', title: 'Ngày nộp', render: (application) => formatDate(application.appliedAt) },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (application) => (
        <Badge status={application.status}>
          {APPLICATION_STATUS_LABEL[application.status] || application.status}
        </Badge>
      ),
    },
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
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      render: (application) => (
        <div className={styles.rowActions}>
          <Button variant="ghost" size="sm" onClick={() => setMatrixTarget(application)}>
            Xem ma trận
          </Button>
          <Link className={styles.actionLink} to={`/candidate/recommended-jobs/${application.job.id}`}>
            Chi tiết đối chiếu
          </Link>
          {/* Chỉ rút được khi nhà tuyển dụng chưa xem xét */}
          {application.status === 'APPLIED' && (
            <Button variant="ghost" size="sm" onClick={() => openWithdraw(application)}>
              Rút đơn
            </Button>
          )}
        </div>
      ),
    },
  ]

  let content
  if (loading) {
    content = <Loading text="Đang tải đơn ứng tuyển..." />
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
  } else if (data.items.length === 0) {
    content = (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Bạn chưa ứng tuyển vị trí nào.</p>
        <Link className={styles.jobLink} to="/">
          Xem việc làm đang tuyển
        </Link>
      </div>
    )
  } else {
    const items = statusFilter ? data.items.filter((item) => item.status === statusFilter) : data.items
    const countOf = (status) => data.items.filter((item) => item.status === status).length
    const filterOptions = [
      { value: '', label: `Tất cả (${data.items.length})` },
      ...STATUSES.map((status) => ({ value: status, label: `${APPLICATION_STATUS_LABEL[status]} (${countOf(status)})` })),
    ]

    content = (
      <>
        <div className={styles.filter}>
          <Select
            label="Lọc theo trạng thái"
            name="status"
            options={filterOptions}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          />
        </div>
        <Table columns={columns} data={items} emptyText="Không có đơn nào ở trạng thái này." />
        {/* Coverage chỉ là chỉ số đối chiếu, luôn kèm câu nhắc của API */}
        {data.note && <p className={styles.note}>{data.note}</p>}
      </>
    )
  }

  return (
    <>
      <h1>Đơn ứng tuyển</h1>

      {notice && (
        <p className={styles.alertSuccess} role="status">
          {notice.text}
        </p>
      )}

      {content}

      {matrixTarget && <MatrixModal application={matrixTarget} onClose={() => setMatrixTarget(null)} />}

      <Modal
        open={withdrawTarget !== null}
        onClose={closeWithdraw}
        title="Rút đơn ứng tuyển"
        footer={
          <>
            <Button variant="secondary" onClick={closeWithdraw} disabled={withdrawing}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleWithdraw} loading={withdrawing}>
              {withdrawing ? 'Đang rút đơn...' : 'Rút đơn'}
            </Button>
          </>
        }
      >
        <p className={styles.modalText}>
          Rút đơn ứng tuyển vị trí "{withdrawTarget ? withdrawTarget.job.title : ''}"? Đơn sẽ bị xóa khỏi danh sách. Nếu
          tin còn mở, bạn có thể ứng tuyển lại sau.
        </p>
        {withdrawError && (
          <p className={styles.alertError} role="alert">
            {withdrawError}
          </p>
        )}
      </Modal>
    </>
  )
}

export default MyApplications
