import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getMyProfile } from '../../api/candidate.api'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/apiError'
import Button from '../common/Button'
import Loading from '../common/Loading'
import Modal from '../common/Modal'
import CVTemplateClassic from './CVTemplateClassic'
import CVTemplateModern from './CVTemplateModern'
import { hasUnconfirmedItems } from './cvData'
import styles from './CVExportModal.module.css'

const TEMPLATES = [
  { id: 'classic', name: 'Cổ điển', description: 'Một cột, hợp in đen trắng', Component: CVTemplateClassic },
  { id: 'modern', name: 'Hiện đại', description: 'Hai cột, liên hệ và kỹ năng bên trái', Component: CVTemplateModern },
]

// Class gắn lên body trong lúc modal mở. CSS in chỉ ẩn trang và chỉ in CV khi body có class này,
// nên in các trang khác của hệ thống vẫn như bình thường
const PRINTING_CLASS = 'cv-printing'
const PRINT_AREA_CLASS = 'cv-print-area'

// Xem trước thu nhỏ: dựng CV trên một trang A4 thật (210mm) rồi thu nhỏ vừa khung bằng transform.
// Tỉ lệ thu nhỏ = bề ngang khung / bề ngang trang A4, đo lại khi khung đổi kích thước
function Thumbnail({ children }) {
  const frameRef = useRef(null)
  const pageRef = useRef(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const frame = frameRef.current
    const page = pageRef.current
    const update = () => setScale(frame.clientWidth / page.offsetWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={frameRef} className={styles.thumbFrame} aria-hidden="true">
      <div ref={pageRef} className={styles.thumbPage} style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}

// Trang ParsedCV chỉ render component này khi bấm "Xuất CV" ({exportOpen && <CVExportModal />}),
// nên mỗi lần mở là một lần tạo mới: state về mặc định và hồ sơ được lấy lại từ đầu.
function CVExportModal({ onClose }) {
  const { user } = useAuth()
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [templateId, setTemplateId] = useState('classic')

  // Lấy GET /candidates/me để CV khớp với dữ liệu vừa sửa ở trang ParsedCV
  useEffect(() => {
    let ignore = false
    getMyProfile()
      .then((result) => {
        if (!ignore) setProfileData(result.data)
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, 'Không tải được hồ sơ để xuất CV'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [reloadKey])

  // Có class này trên body thì CSS in mới ẩn trang và chỉ in CV; đóng modal thì gỡ ra
  useEffect(() => {
    document.body.classList.add(PRINTING_CLASS)
    return () => document.body.classList.remove(PRINTING_CLASS)
  }, [])

  function handleRetry() {
    setError('')
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  // API hồ sơ không có email, lấy email của tài khoản đang đăng nhập (đã có từ /auth/me)
  const profile = profileData ? { ...profileData, email: user ? user.email : '' } : null
  const selected = TEMPLATES.find((template) => template.id === templateId)
  const SelectedTemplate = selected.Component

  function handlePrint() {
    // Trình duyệt lấy tiêu đề trang làm tên file PDF mặc định: đặt tạm "CV - Họ tên" rồi trả lại.
    // window.print() chờ tới khi hộp thoại in đóng mới chạy tiếp
    const previousTitle = document.title
    document.title = `CV - ${profile.fullName}`
    window.print()
    document.title = previousTitle
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Xuất CV"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
            <Button onClick={handlePrint} disabled={!profile}>
              In / Lưu PDF
            </Button>
          </>
        }
      >
        {loading && <Loading text="Đang tải hồ sơ..." />}

        {!loading && error && (
          <>
            <p className={styles.alertError} role="alert">
              {error}
            </p>
            <Button variant="secondary" onClick={handleRetry}>
              Thử lại
            </Button>
          </>
        )}

        {!loading && !error && profile && (
          <div className={styles.body}>
            {/* Vẫn cho xuất, không lọc bỏ mục chưa xác nhận: chỉ nhắc kiểm tra */}
            {hasUnconfirmedItems(profile) && (
              <p className={styles.warning} role="status">
                Hồ sơ còn mục chưa xác nhận, nên kiểm tra lại trước khi xuất.
              </p>
            )}

            <fieldset className={styles.choices}>
              <legend className={styles.legend}>Chọn mẫu CV</legend>
              <div className={styles.options}>
                {TEMPLATES.map((template) => (
                  <label
                    key={template.id}
                    className={
                      template.id === templateId ? `${styles.option} ${styles.optionSelected}` : styles.option
                    }
                  >
                    <Thumbnail>
                      <template.Component profile={profile} />
                    </Thumbnail>
                    <span className={styles.optionName}>
                      <input
                        type="radio"
                        name="cv-template"
                        value={template.id}
                        checked={template.id === templateId}
                        onChange={() => setTemplateId(template.id)}
                        className={styles.radio}
                      />
                      {template.name}
                    </span>
                    <span className={styles.optionDesc}>{template.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <p className={styles.note}>
              Khi hộp thoại in mở ra: chọn khổ giấy A4, chọn "Lưu dưới dạng PDF" nếu muốn lưu file, và bỏ tick "Đầu
              trang và chân trang" (Headers and footers) để CV không bị in kèm ngày giờ và đường dẫn trang.
            </p>
          </div>
        )}
      </Modal>

      {/* Vùng in: gắn thẳng vào body, ẩn trên màn hình, chỉ hiện khi in (CVExportModal.module.css) */}
      {profile &&
        createPortal(
          <div className={`${PRINT_AREA_CLASS} ${styles.printArea}`}>
            <SelectedTemplate profile={profile} />
          </div>,
          document.body,
        )}
    </>
  )
}

export default CVExportModal
