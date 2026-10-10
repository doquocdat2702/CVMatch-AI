import { useEffect, useRef, useState } from 'react'
import { deleteCV, extractCV, getCVs, parseCV, uploadCV } from '../../api/cv.api'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import Table from '../../components/common/Table'
import { getErrorMessage } from '../../utils/apiError'
import { formatDateTime } from '../../utils/format'
import styles from './CVUpload.module.css'

// Khớp kiểm tra của backend (upload.middleware.js): chỉ PDF, DOCX và tối đa 5MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx']
const MAX_FILE_SIZE = 5 * 1024 * 1024

const STATUS_LABEL = {
  UPLOADED: 'Chưa phân tích',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Đã phân tích',
  FAILED: 'Lỗi',
}

// "Phân tích CV" gồm 2 bước gọi tuần tự 2 endpoint của backend
const STEP_TEXT = {
  extract: 'Bước 1/2: Đang trích xuất nội dung...',
  parse: 'Bước 2/2: Đang phân tích...',
}

// Kiểm tra ngay tại trình duyệt, trả câu lỗi hoặc chuỗi rỗng nếu hợp lệ
function validateFile(file) {
  const name = file.name.toLowerCase()
  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return 'Chỉ nhận file PDF (.pdf) hoặc Word (.docx)'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File vượt quá 5MB'
  }
  return ''
}

function CVUpload() {
  const [cvs, setCvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  // Tăng số này để tải lại danh sách (nút Thử lại)
  const [reloadKey, setReloadKey] = useState(0)

  // Tải lên
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState(null) // { type: 'success' | 'error', text }

  // Phân tích đang chạy: { cvId, fileName, step: 'extract' | 'parse' }
  const [processing, setProcessing] = useState(null)
  // Kết quả phân tích hoặc xóa: { type, text }
  const [notice, setNotice] = useState(null)

  // Xóa: CV đang chờ xác nhận
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Đang tải lên hoặc đang phân tích thì khóa các thao tác khác
  const busy = uploading || processing !== null

  useEffect(() => {
    let ignore = false
    getCVs()
      .then((result) => {
        if (!ignore) setCvs(result.data)
      })
      .catch((err) => {
        if (!ignore) setLoadError(getErrorMessage(err, 'Không tải được danh sách CV'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [reloadKey])

  function handleRetry() {
    setLoadError('')
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  // Lấy lại danh sách sau mỗi thao tác để có status và errorMessage mới nhất
  async function refreshList() {
    try {
      const result = await getCVs()
      setCvs(result.data)
    } catch {
      // Lỗi thì giữ danh sách đang hiện, lần tải trang sau sẽ lấy lại
    }
  }

  // ===== Tải lên =====

  async function handleFile(file) {
    // Mỗi thao tác mới thì bỏ thông báo cũ của thao tác trước
    setUploadMessage(null)
    setNotice(null)
    const error = validateFile(file)
    if (error) {
      setUploadMessage({ type: 'error', text: error })
      return
    }

    setUploading(true)
    try {
      await uploadCV(file)
      setUploadMessage({
        type: 'success',
        text: `Đã tải lên "${file.name}". Bấm "Phân tích CV" để hệ thống đọc nội dung.`,
      })
      await refreshList()
    } catch (err) {
      setUploadMessage({ type: 'error', text: getErrorMessage(err, 'Tải CV lên thất bại') })
    } finally {
      setUploading(false)
    }
  }

  function handleInputChange(event) {
    const file = event.target.files[0]
    // Xóa giá trị để chọn lại đúng file đó vẫn kích hoạt onChange
    event.target.value = ''
    if (file) handleFile(file)
  }

  // Phải chặn mặc định ở dragover thì sự kiện drop mới xảy ra (không thì trình duyệt tự mở file)
  function handleDragOver(event) {
    event.preventDefault()
    if (!busy) setDragOver(true)
  }

  function handleDragLeave(event) {
    // Chỉ tắt viền khi chuột rời hẳn vùng thả, không phải khi đi qua phần tử con
    if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(false)
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragOver(false)
    if (busy) return

    const files = event.dataTransfer.files
    if (files.length > 1) {
      setUploadMessage({ type: 'error', text: 'Mỗi lần chỉ tải lên một file' })
      return
    }
    if (files.length === 1) handleFile(files[0])
  }

  // ===== Phân tích: gọi extract rồi parse =====

  async function handleAnalyze(cv) {
    setUploadMessage(null)
    setNotice(null)
    let step = 'extract'
    setProcessing({ cvId: cv.id, fileName: cv.fileName, step })

    try {
      await extractCV(cv.id)
      step = 'parse'
      setProcessing({ cvId: cv.id, fileName: cv.fileName, step })
      await parseCV(cv.id)
      setNotice({ type: 'success', text: `Đã phân tích xong CV "${cv.fileName}".` })
    } catch (err) {
      const prefix = step === 'extract' ? 'Trích xuất nội dung thất bại' : 'Phân tích thất bại'
      setNotice({ type: 'error', text: `${prefix}: ${getErrorMessage(err)}` })
    } finally {
      // Lấy status mới trước rồi mới bỏ trạng thái "Đang xử lý", để dòng không nháy về status cũ
      await refreshList()
      setProcessing(null)
    }
  }

  // ===== Xóa =====

  function openDelete(cv) {
    setUploadMessage(null)
    setNotice(null)
    setDeleteError('')
    setDeleteTarget(cv)
  }

  // Đang xóa thì không cho đóng hộp thoại
  function closeDelete() {
    if (!deleting) setDeleteTarget(null)
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteCV(deleteTarget.id)
      setNotice({ type: 'success', text: `Đã xóa CV "${deleteTarget.fileName}".` })
      setDeleteTarget(null)
      await refreshList()
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Xóa CV thất bại'))
    } finally {
      setDeleting(false)
    }
  }

  // ===== Bảng =====

  const columns = [
    {
      key: 'fileName',
      title: 'Tên file',
      render: (cv) => <span className={styles.fileName}>{cv.fileName}</span>,
    },
    {
      key: 'uploadedAt',
      title: 'Ngày tải lên',
      render: (cv) => formatDateTime(cv.uploadedAt),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (cv) => {
        // Dòng đang phân tích hiện "Đang xử lý" ngay, không chờ backend
        const status = processing && processing.cvId === cv.id ? 'PROCESSING' : cv.status
        return (
          <div className={styles.statusCell}>
            <Badge status={status}>{STATUS_LABEL[status] || status}</Badge>
            {status === 'FAILED' && cv.errorMessage && <p className={styles.errorText}>{cv.errorMessage}</p>}
          </div>
        )
      },
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      render: (cv) => {
        const isProcessing = cv.status === 'PROCESSING' || (processing !== null && processing.cvId === cv.id)
        const isDone = cv.status === 'COMPLETED'
        let analyzeLabel = 'Phân tích CV'
        if (isProcessing) analyzeLabel = 'Đang xử lý'
        else if (isDone) analyzeLabel = 'Phân tích lại'

        return (
          <div className={styles.rowActions}>
            <Button
              size="sm"
              variant={isDone ? 'secondary' : 'primary'}
              onClick={() => handleAnalyze(cv)}
              disabled={busy || isProcessing}
            >
              {analyzeLabel}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => openDelete(cv)} disabled={busy}>
              Xóa
            </Button>
          </div>
        )
      },
    },
  ]

  const dropzoneClass = [styles.dropzone, dragOver ? styles.dragOver : ''].filter(Boolean).join(' ')

  return (
    <>
      <h1>CV của tôi</h1>
      <p className={styles.intro}>
        Tải CV lên rồi bấm "Phân tích CV" để hệ thống đọc kỹ năng, kinh nghiệm và học vấn vào hồ sơ của bạn.
      </p>

      <section className={styles.section}>
        <h2>Tải CV lên</h2>
        <div className={dropzoneClass} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          {uploading ? (
            <Loading text="Đang tải CV lên..." />
          ) : (
            <>
              <p className={styles.dropTitle}>Kéo thả file CV vào đây</p>
              <Button variant="secondary" onClick={() => fileInputRef.current.click()} disabled={busy}>
                Chọn file từ máy
              </Button>
              <p className={styles.dropHint}>Chỉ nhận PDF hoặc DOCX, tối đa 5MB</p>
            </>
          )}
          {/* Ô chọn file thật được ẩn, nút "Chọn file từ máy" mở nó */}
          <input ref={fileInputRef} type="file" accept=".pdf,.docx" hidden onChange={handleInputChange} />
        </div>
        {uploadMessage && (
          <p
            className={uploadMessage.type === 'error' ? styles.alertError : styles.alertSuccess}
            role={uploadMessage.type === 'error' ? 'alert' : 'status'}
          >
            {uploadMessage.text}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2>Danh sách CV</h2>

        {processing && (
          <div className={styles.progress}>
            <p className={styles.progressTitle}>Đang phân tích CV "{processing.fileName}"</p>
            <Loading text={STEP_TEXT[processing.step]} />
            <p className={styles.progressNote}>Bước phân tích có thể mất vài chục giây, vui lòng không đóng trang.</p>
          </div>
        )}

        {notice && (
          <p
            className={notice.type === 'error' ? styles.alertError : styles.alertSuccess}
            role={notice.type === 'error' ? 'alert' : 'status'}
          >
            {notice.text}
          </p>
        )}

        {loading && <Loading text="Đang tải danh sách CV..." />}
        {!loading && loadError && (
          <>
            <p className={styles.alertError} role="alert">
              {loadError}
            </p>
            <Button variant="secondary" onClick={handleRetry}>
              Thử lại
            </Button>
          </>
        )}
        {!loading && !loadError && (
          <Table columns={columns} data={cvs} emptyText="Chưa có CV nào. Hãy tải CV lên ở phía trên." />
        )}
      </section>

      <Modal
        open={deleteTarget !== null}
        onClose={closeDelete}
        title="Xóa CV"
        footer={
          <>
            <Button variant="secondary" onClick={closeDelete} disabled={deleting}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              {deleting ? 'Đang xóa...' : 'Xóa CV'}
            </Button>
          </>
        }
      >
        <p className={styles.modalText}>
          Xóa CV "{deleteTarget ? deleteTarget.fileName : ''}"? File sẽ bị xóa khỏi hệ thống và không khôi phục được.
        </p>
        {deleteError && (
          <p className={styles.alertError} role="alert">
            {deleteError}
          </p>
        )}
      </Modal>
    </>
  )
}

export default CVUpload
