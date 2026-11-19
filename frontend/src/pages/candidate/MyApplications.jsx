import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getMyApplications, withdrawApplication } from '../../api/application.api'
import ApplicationProgress from '../../components/application/ApplicationProgress'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import Select from '../../components/common/Select'
import CvViewButton from '../../components/cv/CvViewButton'
import PageHeader from '../../components/layout/PageHeader'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getErrorMessage } from '../../utils/apiError'
import { formatDate, formatNumber, formatRelative } from '../../utils/format'
import { APPLICATION_STATUS_LABEL } from '../../utils/labels'
import { paginate, readPage, withPage } from '../../utils/pagination'
import styles from './MyApplications.module.css'

const STATUSES = ['APPLIED', 'REVIEWING', 'ACCEPTED', 'REJECTED']

function MyApplications() {
  useDocumentTitle('Đơn ứng tuyển')
  // API trả cả danh sách đơn: phân trang phía client (D1), trang hiện tại trên URL (?page=)
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Bộ lọc trạng thái trên URL (?status=, QA-33) để F5 / Back giữ đúng bộ lọc. '' = tất cả; giá trị lạ coi như không lọc
  const paramStatus = searchParams.get('status')
  const statusFilter = STATUSES.includes(paramStatus) ? paramStatus : ''
  const [notice, setNotice] = useState(null)

  // Đơn đang chờ xác nhận rút
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

  // Đổi trạng thái lọc thì về trang 1. Thêm mục lịch sử (không replace) để Back bỏ bộ lọc vừa chọn
  function changeStatusFilter(status) {
    const params = withPage(searchParams, 1)
    if (status) {
      params.set('status', status)
    } else {
      params.delete('status')
    }
    setSearchParams(params)
  }

  function handleStatusChange(event) {
    changeStatusFilter(event.target.value)
  }

  // Lọc ra rỗng: nút "Xem tất cả đơn" bỏ lọc, về trang 1
  function clearStatusFilter() {
    changeStatusFilter('')
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
          {/* Backend chỉ lưu % lúc nộp (Application.coverage), không lưu số yêu cầu x/y nên giữ dạng % (T35j A5).
              Số x/y hiện tại xem ở trang Chi tiết đối chiếu */}
          <p className={styles.coverage}>
            {application.coverage === null || application.coverage === undefined
              ? 'Lúc ứng tuyển: tin tuyển dụng chưa có yêu cầu để đối chiếu'
              : `Lúc ứng tuyển: ${formatNumber(application.coverage)}% yêu cầu có bằng chứng`}
          </p>
        </div>

        <div className={styles.cardActions}>
          {/* T35j: một nút duy nhất, mở trang Chi tiết đối chiếu (thay cho hộp bảng đối chiếu + link riêng) */}
          <div className={styles.actionGroup}>
            <Link className={styles.linkButton} to={`/candidate/recommended-jobs/${application.job.id}`}>
              Xem đối chiếu<span className={styles.srOnly}>: {application.job.title}</span>
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
      </>
    )
  }

  return (
    <>
      <PageHeader title="Đơn ứng tuyển" />

      {notice && (
        <p className={styles.alertSuccess} role="status">
          {notice.text}
        </p>
      )}

      {content}

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
