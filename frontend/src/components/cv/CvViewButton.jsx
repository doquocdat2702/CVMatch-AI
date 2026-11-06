import { useState } from 'react'
import { openCvFile } from '../../utils/cvFile'
import Button from '../common/Button'
import styles from './CvViewButton.module.css'

// Nút xem file CV gốc (T35f), dùng ở trang CV của tôi, hộp ứng tuyển, trang Đơn ứng tuyển của ứng viên và HR.
//   cv: { id, fileName, fileType } | null — null thì hiện missingText thay cho nút (vd CV đã bị xóa)
//   label: chữ trên nút; PDF mở tab mới, DOCX tải về
//   variant: kiểu Button (mặc định ghost như trong bảng; thẻ CV ở trang CV của tôi dùng secondary, T35f)
function CvViewButton({ cv, label = 'Xem CV', missingText = 'CV đã bị xóa', variant = 'ghost' }) {
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState('')

  if (!cv) {
    return <span className={styles.missing}>{missingText}</span>
  }

  async function handleClick() {
    setError('')
    setOpening(true)
    try {
      await openCvFile(cv)
    } catch (err) {
      setError(err.message)
    } finally {
      setOpening(false)
    }
  }

  return (
    <span className={styles.wrap}>
      <Button
        variant={variant}
        size="sm"
        onClick={handleClick}
        loading={opening}
        // Đọc kèm tên file để các nút "Xem" trong cùng danh sách phân biệt được với nhau
        aria-label={`${label}: ${cv.fileName}${cv.fileType === 'PDF' ? ' (mở tab mới)' : ' (tải về)'}`}
      >
        {opening ? 'Đang mở...' : label}
      </Button>
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </span>
  )
}

export default CvViewButton
