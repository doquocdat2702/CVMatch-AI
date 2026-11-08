import { useEffect, useId, useRef, useState } from 'react'
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
// Hộp ứng tuyển (T35g): ứng viên chọn CV gửi kèm đơn (radio, chọn sẵn CV mới nhất), đơn lưu đúng CV đã chọn
// (Application.cvId). Đối chiếu yêu cầu vẫn dùng hồ sơ hiện tại (lần phân tích CV gần nhất), nên CV đang chọn khác
// CV đã phân tích thì hộp nói rõ. "Tải CV mới" tải + phân tích ngay trong hộp rồi tự chọn CV đó.
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
  // CV đang chọn gửi kèm đơn
  const [selectedCvId, setSelectedCvId] = useState(null)
  const fileInputRef = useRef(null)
  const radioName = useId()

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

  // preferId: CV cần chọn sau khi tải (CV vừa tải lên). Không có thì giữ lựa chọn cũ nếu CV đó còn,
  // không còn thì chọn CV mới nhất (API trả mới nhất trước)
  async function loadCvs(preferId) {
    setCvs({ ...EMPTY_CVS, loading: true })
    try {
      const result = await getCVs()
      const items = result.data
      setCvs({ loading: false, items, error: '' })
      setSelectedCvId((current) => {
        const wanted = preferId !== undefined ? preferId : current
        if (items.some((cv) => cv.id === wanted)) return wanted
        return items.length > 0 ? items[0].id : null
      })
    } catch (err) {
      setCvs({ ...EMPTY_CVS, error: getErrorMessage(err, 'Không tải được danh sách CV.') })
    }
  }

  function openModal() {
    setError('')
    setUploadError('')
    setSubmitted(false)
    // Mỗi lần mở hộp chọn sẵn CV mới nhất
    setSelectedCvId(null)
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
    // CV vừa tải lên được chọn sẵn, kể cả khi phân tích lỗi (file vẫn gửi kèm đơn được)
    let uploadedId
    try {
      const uploaded = await uploadAndAnalyzeCv(file, setUploadStep)
      uploadedId = uploaded.id
    } catch (err) {
      if (err.cv) uploadedId = err.cv.id
      const prefix = { upload: 'Tải CV lên thất bại', extract: 'Đọc nội dung CV thất bại', parse: 'Phân tích CV thất bại' }
      setUploadError(`${prefix[err.step] || 'Lỗi'}: ${getErrorMessage(err)}`)
    } finally {
      setUploadStep(null)
      // Lấy lại danh sách: CV vừa phân tích xong là CV dùng cho hồ sơ, nút gửi đơn mở khóa
      loadCvs(uploadedId)
    }
  }

  async function handleSubmit() {
    setError('')
    setSubmitting(true)
    try {
      // Gửi đúng CV đang chọn trong hộp
      const result = await applyJob(Number(jobId), selectedCvId)
      // Đơn vừa tạo: bên ngoài hộp chuyển thành "Đã ứng tuyển"
      setApplication(result.data)
      setSubmitted(true)
    } catch (err) {
      // Vd tin vừa đóng, đã ứng tuyển ở tab khác: giữ hộp mở và hiện câu của API
      setError(getErrorMessage(err, 'Chưa gửi được đơn ứng tuyển. Vui lòng thử lại.'))
    } finally {
      setSubmitting(false)
    }
  }

  // CV đã dùng để phân tích hồ sơ = CV đã phân tích (COMPLETED) có lần phân tích gần nhất.
  // Chưa có CV nào đã phân tích thì chưa ứng tuyển được (backend chặn), hộp hướng dẫn tải CV ngay tại đây
  const analysedCv =
    cvs.items
      .filter((cv) => cv.status === 'COMPLETED')
      .sort((a, b) => new Date(b.parsedAt || b.uploadedAt) - new Date(a.parsedAt || a.uploadedAt))[0] || null
  const selectedCv = cvs.items.find((cv) => cv.id === selectedCvId) || null
  const selectedDiffers = selectedCv !== null && analysedCv !== null && selectedCv.id !== analysedCv.id

  let body
  if (submitted) {
    body = (
      <div className={styles.done} role="status">
        <p className={styles.doneTitle}>Đã gửi đơn ứng tuyển</p>
        <p className={styles.doneText}>Bạn sẽ nhận thông báo khi nhà tuyển dụng cập nhật trạng thái đơn.</p>
        <Link className={styles.link} to="/candidate/applications">
          Xem đơn ứng tuyển
        </Link>
      </div>
    )
  } else {
    const fileInput = (
      <input
        ref={fileInputRef}
        className={styles.fileInput}
        type="file"
        accept=".pdf,.docx"
        onChange={handleFileChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    )
    const uploadStatus = (
      <>
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
      </>
    )

    let cvSection
    if (cvs.loading) {
      cvSection = <Loading text="Đang tải danh sách CV..." />
    } else if (cvs.error) {
      cvSection = (
        <div className={styles.inlineState}>
          <p className={styles.error} role="alert">
            {cvs.error}
          </p>
          <Button variant="secondary" size="sm" onClick={() => loadCvs()}>
            Thử lại
          </Button>
        </div>
      )
    } else {
      cvSection = (
        <>
          {cvs.items.length > 0 && (
            <fieldset className={styles.cvFieldset} disabled={busy}>
              <legend className={styles.cvLegend}>Chọn CV gửi kèm đơn</legend>
              <ul className={styles.cvList}>
                {cvs.items.map((cv) => {
                  const selected = cv.id === selectedCvId
                  return (
                    <li key={cv.id} className={selected ? `${styles.cvItem} ${styles.cvItemSelected}` : styles.cvItem}>
                      <label className={styles.cvOption}>
                        <input
                          className={styles.radio}
                          type="radio"
                          name={radioName}
                          value={cv.id}
                          checked={selected}
                          onChange={() => setSelectedCvId(cv.id)}
                        />
                        <span className={styles.cvInfo}>
                          <span className={styles.cvName}>{cv.fileName}</span>
                          <span className={styles.cvMeta}>
                            Tải lên {formatDate(cv.uploadedAt)}
                            <Badge status={cv.status}>{CV_STATUS_LABEL[cv.status] || cv.status}</Badge>
                            {analysedCv && cv.id === analysedCv.id && (
                              <span className={styles.currentTag}>Dùng cho hồ sơ</span>
                            )}
                          </span>
                        </span>
                      </label>
                      {/* Nút Xem nằm ngoài nhãn: bấm Xem không đổi lựa chọn */}
                      <span className={styles.cvAction}>
                        <CvViewButton cv={cv} label="Xem" />
                      </span>
                    </li>
                  )
                })}
              </ul>
            </fieldset>
          )}

          {cvs.items.length > 0 && (
            // aria-live: đổi CV thì trình đọc màn hình đọc lại câu "CV này khác..." khi câu đó hiện ra
            <p className={styles.attachNote} aria-live="polite">
              CV được chọn sẽ gửi kèm đơn ứng tuyển. Kết quả đối chiếu dựa trên hồ sơ hiện tại của bạn.
              {selectedDiffers && ' Lưu ý: hồ sơ của bạn chưa được cập nhật từ CV này.'}
            </p>
          )}

          {analysedCv ? (
            // Đã có CV phân tích: "Tải CV mới" gọn một dòng, tải và phân tích xong thì tự chọn CV đó
            <div className={styles.uploadRow}>
              {fileInput}
              <Button
                variant="secondary"
                size="sm"
                className={styles.touch}
                onClick={() => fileInputRef.current.click()}
                disabled={busy}
              >
                Tải CV mới
              </Button>
              <span className={styles.uploadHint}>PDF hoặc DOCX, tối đa 5 MB. CV mới sẽ được phân tích để cập nhật hồ sơ.</span>
              {uploadStatus}
            </div>
          ) : (
            // Chưa có CV đã phân tích: tải ngay trong hộp, xong thì CV đó được chọn và hồ sơ có dữ liệu để đối chiếu
            <div className={styles.uploadBox}>
              <p className={styles.uploadText}>
                {cvs.items.length === 0
                  ? 'Bạn chưa có CV. Tải CV lên để ứng tuyển.'
                  : 'Bạn chưa có CV đã phân tích. Tải CV lên để ứng tuyển.'}{' '}
                Nhận file PDF hoặc DOCX, tối đa 5 MB.
              </p>
              {fileInput}
              <Button
                variant="secondary"
                size="sm"
                className={styles.touch}
                onClick={() => fileInputRef.current.click()}
                disabled={busy}
              >
                Tải CV mới
              </Button>
              {uploadStatus}
            </div>
          )}
        </>
      )
    }

    body = (
      <>
        {cvSection}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </>
    )
  }

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
        // Chưa có CV đã phân tích (hồ sơ trống) hoặc chưa chọn CV thì chưa gửi được
        disabled={!analysedCv || !selectedCv || uploadStep !== null}
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
        <p className={styles.meta}>Ứng tuyển lúc {formatDateTime(application.appliedAt)}</p>
        {!isPanel && viewLink}
      </div>
    )
  } else if (!isOpen) {
    action = <p className={styles.closed}>Tin tuyển dụng đã ngừng nhận đơn</p>
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
