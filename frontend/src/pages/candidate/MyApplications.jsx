import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getApplicationDetail, getMyApplications, withdrawApplication } from '../../api/application.api'
import ApplicationProgress from '../../components/application/ApplicationProgress'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import Select from '../../components/common/Select'
import CvViewButton from '../../components/cv/CvViewButton'
import PageHeader from '../../components/layout/PageHeader'
import RequirementEvidenceMatrix from '../../components/matching/RequirementEvidenceMatrix'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getErrorMessage } from '../../utils/apiError'
import { formatDate, formatNumber, formatRelative } from '../../utils/format'
import { APPLICATION_STATUS_LABEL } from '../../utils/labels'
import { paginate, readPage, withPage } from '../../utils/pagination'
import styles from './MyApplications.module.css'

const STATUSES = ['APPLIED', 'REVIEWING', 'ACCEPTED', 'REJECTED']

// "x/y yêu cầu có bằng chứng (z%)"; job chưa có yêu cầu thì nói rõ thay vì "0/0 (0%)"
function formatCoverage(supported, total, coverage) {
  if (!total) return 'Tin tuyển dụng chưa có yêu cầu để đối chiếu'
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
        if (!ignore) setError(getErrorMessage(err, 'Không tải được kết quả đối chiếu.'))
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
              Lúc ứng tuyển:{' '}
              {detail.coverageAtApply === null || detail.coverageAtApply === undefined
                ? 'tin tuyển dụng chưa có yêu cầu để đối chiếu'
                : `${formatNumber(detail.coverageAtApply)}% yêu cầu có bằng chứng`}
            </p>
            <p className={styles.muted}>
              Kết quả tính theo hồ sơ hiện tại của bạn nên có thể khác lúc ứng tuyển.
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
  useDocumentTitle('Đơn ứng tuyển')
  // API trả cả danh sách đơn: phân trang phía client (D1), trang hiện tại trên URL (?page=)
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams)
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
        if (!ignore) setError(getErrorMessage(err, 'Không tải được danh sách đơn ứng tuyển.'))
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

  // Đổi trạng thái lọc thì về trang 1
  function handleStatusChange(event) {
    setStatusFilter(event.target.value)
    setSearchParams(withPage(searchParams, 1), { replace: true })
  }

  // Lọc ra rỗng: nút "Xem tất cả đơn" bỏ lọc, về trang 1
  function clearStatusFilter() {
    setStatusFilter('')
    setSearchParams(withPage(searchParams, 1), { replace: true })
  }

  function handlePageChange(nextPage) {
    setSearchParams(withPage(searchParams, nextPage))
    window.scrollTo(0, 0)
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
      setWithdrawError(getErrorMessage(err, 'Chưa rút được đơn. Vui lòng thử lại.'))
    } finally {
      setWithdrawing(false)
      await refreshList()
    }
  }

  // ===== Thẻ đơn (T35f, thay cho bảng: điện thoại không phải cuộn ngang) =====

  function renderCard(application) {
    return (
      <li key={application.id} className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.cardInfo}>
            <h2 className={styles.jobTitle}>
              <Link className={styles.jobLink} to={`/jobs/${application.job.id}`}>
                {application.job.title}
              </Link>
            </h2>
            <p className={styles.cardMeta}>
              Ứng tuyển ngày {formatDate(application.appliedAt)} ({formatRelative(application.appliedAt)})
            </p>
          </div>
          <Badge status={application.status}>
            {APPLICATION_STATUS_LABEL[application.status] || application.status}
          </Badge>
        </div>

        {/* CV gửi kèm đơn (T35g). Đơn cũ chưa lưu CV: hiện CV hiện tại kèm ghi chú; không còn CV thì "CV đã bị xóa" */}
        <div className={styles.cvLine}>
          <span className={styles.cvLabel}>CV gửi kèm:</span>
          {application.cv && <span className={styles.cvName}>{application.cv.fileName}</span>}
          {application.cv && application.cvLegacy && (
            <span className={styles.cvLegacy}>Đang hiển thị CV hiện tại của bạn</span>
          )}
          <CvViewButton cv={application.cv} />
        </div>

        <div className={styles.cardBody}>
          <ApplicationProgress status={application.status} />
          {/* Backend chỉ lưu % lúc nộp (không lưu số yêu cầu), xem đủ "x/y" trong ma trận */}
          <p className={styles.coverage}>
            {application.coverage === null || application.coverage === undefined
              ? 'Lúc ứng tuyển: tin tuyển dụng chưa có yêu cầu để đối chiếu'
              : `Lúc ứng tuyển: ${formatNumber(application.coverage)}% yêu cầu có bằng chứng`}
          </p>
        </div>

        <div className={styles.cardActions}>
          <div className={styles.actionGroup}>
            <Button variant="secondary" size="sm" onClick={() => setMatrixTarget(application)}>
              Xem bảng đối chiếu
            </Button>
            <Link className={styles.linkButton} to={`/candidate/recommended-jobs/${application.job.id}`}>
              Chi tiết đối chiếu
            </Link>
          </div>
          {/* Chỉ rút được khi nhà tuyển dụng chưa xem xét */}
          {application.status === 'APPLIED' && (
            <Button variant="ghost" size="sm" onClick={() => openWithdraw(application)}>
              Rút đơn<span className={styles.srOnly}> {application.job.title}</span>
            </Button>
          )}
        </div>
      </li>
    )
  }

  let content
  if (loading) {
    content = <Loading text="Đang tải đơn ứng tuyển..." />
  } else if (error) {
    content = (
      <div className={styles.state}>
        <p className={styles.alertError} role="alert">
          {error}
        </p>
        <Button variant="secondary" onClick={handleRetry}>
          Thử lại
        </Button>
      </div>
    )
  } else if (data.items.length === 0) {
    // Trạng thái rỗng: một câu + một hành động chính
    content = (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Bạn chưa ứng tuyển vị trí nào.</p>
        <p className={styles.emptyText}>Đơn bạn gửi sẽ hiện ở đây cùng trạng thái xét duyệt.</p>
        <Link className={styles.primaryLink} to="/">
          Xem việc làm
        </Link>
      </div>
    )
  } else {
    const items = statusFilter ? data.items.filter((item) => item.status === statusFilter) : data.items
    const { pageItems, page: currentPage, totalPages } = paginate(items, page)
    const countOf = (status) => data.items.filter((item) => item.status === status).length
    const filterOptions = [
      { value: '', label: `Tất cả (${data.items.length})` },
      ...STATUSES.map((status) => ({ value: status, label: `${APPLICATION_STATUS_LABEL[status]} (${countOf(status)})` })),
    ]

    content = (
      <>
        <div className={styles.toolbar}>
          <div className={styles.filter}>
            <Select
              label="Lọc theo trạng thái"
              name="status"
              options={filterOptions}
              value={statusFilter}
              onChange={handleStatusChange}
            />
          </div>
        </div>

        {pageItems.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Không có đơn nào ở trạng thái này.</p>
            <Button variant="secondary" onClick={clearStatusFilter}>
              Xem tất cả đơn
            </Button>
          </div>
        ) : (
          <ul className={styles.list}>{pageItems.map(renderCard)}</ul>
        )}
        <div className={styles.pagination}>
          <Pagination page={currentPage} totalPages={totalPages} onChange={handlePageChange} />
        </div>
        {/* Coverage chỉ là chỉ số đối chiếu, luôn kèm câu nhắc của API */}
        {data.note && <p className={styles.note}>{data.note}</p>}
      </>
    )
  }

  return (
    <>
      <PageHeader title="Đơn ứng tuyển" description="Theo dõi trạng thái các đơn bạn đã gửi." />

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
