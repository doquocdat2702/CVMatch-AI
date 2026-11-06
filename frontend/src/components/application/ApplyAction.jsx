import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { applyJob, getMyApplications } from '../../api/application.api'
import { getCVs } from '../../api/cv.api'
import { getErrorMessage } from '../../utils/apiError'
import { CV_UPLOAD_STEP_TEXT, uploadAndAnalyzeCv, validateCvFile } from '../../utils/cvUpload'
import { formatDate, formatDateTime } from '../../utils/format'
import { APPLICATION_STATUS_LABEL, CV_STATUS_LABEL } from '../../utils/labels'
import Badge from '../common/Badge'
import Button from '../common/Button'
import Loading from '../common/Loading'
import Modal from '../common/Modal'
import CvViewButton from '../cv/CvViewButton'
import styles from './ApplyAction.module.css'

const EMPTY_CVS = { loading: false, items: [], error: '' }

// Khối Ứng tuyển dùng chung cho trang Chi tiết công việc và Chi tiết đối chiếu (T35f).
// Chỉ dùng khi người xem là ứng viên đã đăng nhập (getMyApplications cần quyền CANDIDATE).
//   - Đã nộp đơn cho tin này: nút "Đã ứng tuyển" bị khóa + trạng thái đơn + link "Xem đơn"
//   - Tin đã đóng: "Tin đã ngừng nhận hồ sơ", không có nút
//   - Còn lại: nút "Ứng tuyển ngay" mở hộp ứng tuyển
// Đơn ứng tuyển không lưu riêng CV: nhà tuyển dụng đối chiếu với hồ sơ đã phân tích và xem CV hiện tại
// (CV mới nhất đã phân tích). Hộp ứng tuyển chỉ liệt kê CV để xem; chưa có CV đã phân tích thì tải ngay trong hộp.
//   autoOpen: tự mở hộp một lần (khách đăng nhập xong quay lại /jobs/:id?apply=1); onAutoOpened báo đã xử lý
//   variant: 'panel' cho khung ứng tuyển của trang chi tiết tin (T35f): nút rộng hết khung, trạng thái đơn
//   gọn trên một dòng để dưới 900px khung dính ở đáy màn hình không cao quá
function ApplyAction({ jobId, jobTitle, isOpen, autoOpen = false, onAutoOpened, variant }) {
  const isPanel = variant === 'panel'
  const [application, setApplication] = useState(null)
  const [checking, setChecking] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [cvs, setCvs] = useState(EMPTY_CVS)
  // Tải CV trong hộp: bước đang chạy ('upload' | 'extract' | 'parse') hoặc null
  const [uploadStep, setUploadStep] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef(null)

  // Giá trị mới nhất của các props dùng sau khi kiểm tra đơn xong. Để trong ref thay vì dependency:
  // onAutoOpened là hàm mới mỗi lần trang cha render, đưa vào dependency sẽ gọi lại API liên tục
  const latestProps = useRef({ autoOpen, isOpen, onAutoOpened })
  useEffect(() => {
    latestProps.current = { autoOpen, isOpen, onAutoOpened }
  })

  // Tìm đơn của ứng viên cho đúng tin này.
  // ?apply=1 (autoOpen): kiểm tra xong mới mở hộp, đúng một lần; đã ứng tuyển hoặc tin đã đóng thì không mở
  useEffect(() => {
    let ignore = false
    let found = null
    getMyApplications()
      .then((result) => {
        found = result.data.items.find((item) => item.job.id === Number(jobId)) || null
        if (!ignore) setApplication(found)
      })
      .catch(() => {
        // Không kiểm tra được thì vẫn cho bấm: backend chặn nộp trùng và báo lại
      })
      .finally(() => {
        if (ignore) return
        setChecking(false)
        const { autoOpen: shouldOpen, isOpen: jobOpen, onAutoOpened: done } = latestProps.current
        if (shouldOpen) {
          if (!found && jobOpen) openModal()
          if (done) done()
        }
      })
    return () => {
      ignore = true
    }
  }, [jobId])

  async function loadCvs() {
    setCvs({ ...EMPTY_CVS, loading: true })
    try {
      const result = await getCVs()
      setCvs({ loading: false, items: result.data, error: '' })
    } catch (err) {
      setCvs({ ...EMPTY_CVS, error: getErrorMessage(err, 'Không tải được danh sách CV') })
    }
  }

  function openModal() {
    setError('')
    setUploadError('')
    setSubmitted(false)
    setModalOpen(true)
    loadCvs()
  }

  const busy = submitting || uploadStep !== null

  // Đang gửi hoặc đang tải CV thì không cho đóng hộp giữa chừng
  function closeModal() {
    if (!busy) setModalOpen(false)
  }

  async function handleFileChange(event) {
    const file = event.target.files[0]
    // Xóa giá trị để chọn lại đúng file đó vẫn kích hoạt onChange
    event.target.value = ''
    if (!file) return
    setUploadError('')
    setError('')
    const invalid = validateCvFile(file)
    if (invalid) {
      setUploadError(invalid)
      return
    }
    try {
      await uploadAndAnalyzeCv(file, setUploadStep)
    } catch (err) {
      const prefix = { upload: 'Tải CV lên thất bại', extract: 'Trích xuất nội dung thất bại', parse: 'Phân tích thất bại' }
      setUploadError(`${prefix[err.step] || 'Lỗi'}: ${getErrorMessage(err)}`)
    } finally {
      setUploadStep(null)
      // Lấy lại danh sách: CV vừa phân tích xong thành CV hiện tại, nút gửi đơn mở khóa
      loadCvs()
    }
  }

  async function handleSubmit() {
    setError('')
    setSubmitting(true)
    try {
      const result = await applyJob(Number(jobId))
      // Đơn vừa tạo: bên ngoài hộp chuyển thành "Đã ứng tuyển"
      setApplication(result.data)
      setSubmitted(true)
    } catch (err) {
      // Vd tin vừa đóng, đã ứng tuyển ở tab khác: giữ hộp mở và hiện câu của API
      setError(getErrorMessage(err, 'Gửi đơn ứng tuyển thất bại, vui lòng thử lại'))
    } finally {
      setSubmitting(false)
    }
  }

  // CV hiện tại = CV mới nhất đã phân tích (API trả mới nhất trước)
  const currentCv = cvs.items.find((cv) => cv.status === 'COMPLETED') || null

  let body
  if (submitted) {
    body = (
      <div className={styles.done} role="status">
        <p className={styles.doneTitle}>Đã gửi đơn ứng tuyển</p>
        <p className={styles.doneText}>Bạn sẽ nhận thông báo khi nhà tuyển dụng cập nhật trạng thái đơn.</p>
        <Link className={styles.link} to="/candidate/applications">
          Xem đơn của tôi
        </Link>
      </div>
    )
  } else {
    let cvSection
    if (cvs.loading) {
      cvSection = <Loading text="Đang tải danh sách CV..." />
    } else if (cvs.error) {
      cvSection = (
        <div className={styles.inlineState}>
          <p className={styles.error} role="alert">
            {cvs.error}
          </p>
          <Button variant="secondary" size="sm" onClick={loadCvs}>
            Thử lại
          </Button>
        </div>
      )
    } else {
      cvSection = (
        <>
          {cvs.items.length > 0 && (
            <ul className={styles.cvList}>
              {cvs.items.map((cv) => (
                <li key={cv.id} className={styles.cvItem}>
                  <div className={styles.cvInfo}>
                    <span className={styles.cvName}>{cv.fileName}</span>
                    <span className={styles.cvMeta}>
                      Tải lên {formatDate(cv.uploadedAt)}
                      <Badge status={cv.status}>{CV_STATUS_LABEL[cv.status] || cv.status}</Badge>
                      {currentCv && cv.id === currentCv.id && <span className={styles.currentTag}>CV hiện tại</span>}
                    </span>
                  </div>
                  <span className={styles.cvAction}>
                    <CvViewButton cv={cv} label="Xem" />
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Chưa có CV đã phân tích: tải ngay trong hộp, xong thì CV đó thành CV hiện tại */}
          {!currentCv && (
            <div className={styles.uploadBox}>
              <p className={styles.uploadText}>
                {cvs.items.length === 0
                  ? 'Bạn chưa có CV nào. Tải CV lên ngay tại đây để ứng tuyển.'
                  : 'Bạn chưa có CV nào đã phân tích xong. Tải CV lên ngay tại đây để ứng tuyển.'}{' '}
                Nhận file PDF hoặc DOCX, tối đa 5MB.
              </p>
              <input
                ref={fileInputRef}
                className={styles.fileInput}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                tabIndex={-1}
                aria-hidden="true"
              />
              <Button
                variant="secondary"
                size="sm"
                className={styles.touch}
                onClick={() => fileInputRef.current.click()}
                disabled={busy}
              >
                Chọn file CV
              </Button>
              {uploadStep && (
                <p className={styles.stepText} role="status">
                  {CV_UPLOAD_STEP_TEXT[uploadStep]}
                </p>
              )}
              {uploadError && (
                <p className={styles.error} role="alert">
                  {uploadError}
                </p>
              )}
            </div>
          )}
        </>
      )
    }

    body = (
      <>
        <p className={styles.intro}>
          Nhà tuyển dụng đối chiếu yêu cầu của tin với hồ sơ đã phân tích từ CV của bạn và xem được CV hiện tại (CV mới
          nhất đã phân tích).
        </p>
        {cvSection}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </>
    )
  }

  // Hộp thoại gắn vào body (ngoài SiteLayout) nên tự đặt vùng bấm 44px cho điện thoại (styles.touch)
  const footer = submitted ? (
    <Button variant="secondary" className={styles.touch} onClick={closeModal}>
      Đóng
    </Button>
  ) : (
    <>
      <Button variant="secondary" className={styles.touch} onClick={closeModal} disabled={busy}>
        Hủy
      </Button>
      <Button
        className={styles.touch}
        onClick={handleSubmit}
        loading={submitting}
        disabled={!currentCv || uploadStep !== null}
      >
        {submitting ? 'Đang gửi đơn...' : 'Gửi đơn ứng tuyển'}
      </Button>
    </>
  )

  // Đang kiểm tra đơn: chưa hiện gì để nút không nháy từ "Ứng tuyển ngay" sang "Đã ứng tuyển"
  if (checking) return null

  const boxClass = isPanel ? `${styles.box} ${styles.panelBox}` : styles.box
  const buttonClass = isPanel ? styles.fullButton : undefined

  let action
  if (application) {
    const statusLine = (
      <p className={styles.status}>
        Trạng thái đơn:{' '}
        <Badge status={application.status}>{APPLICATION_STATUS_LABEL[application.status] || application.status}</Badge>
      </p>
    )
    const viewLink = (
      <Link className={styles.link} to="/candidate/applications">
        Xem đơn
      </Link>
    )
    action = (
      <div className={boxClass}>
        <Button className={buttonClass} disabled>
          Đã ứng tuyển
        </Button>
        {isPanel ? (
          // Khung ứng tuyển: trạng thái và "Xem đơn" chung một dòng
          <div className={styles.statusRow}>
            {statusLine}
            {viewLink}
          </div>
        ) : (
          statusLine
        )}
        <p className={styles.meta}>Nộp lúc {formatDateTime(application.appliedAt)}</p>
        {!isPanel && viewLink}
      </div>
    )
  } else if (!isOpen) {
    action = <p className={styles.closed}>Tin đã ngừng nhận hồ sơ</p>
  } else {
    action = (
      <div className={boxClass}>
        <Button className={buttonClass} onClick={openModal}>
          Ứng tuyển ngay
        </Button>
      </div>
    )
  }

  return (
    <>
      {action}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={jobTitle ? `Ứng tuyển: ${jobTitle}` : 'Ứng tuyển'}
        footer={footer}
        closeButtonClassName={styles.touch}
      >
        {body}
      </Modal>
    </>
  )
}

export default ApplyAction
