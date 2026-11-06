import { getCVFile } from '../api/cv.api'
import { getErrorMessage } from './apiError'

// Thời gian giữ object URL: đủ để tab mới nạp xong PDF hoặc trình duyệt bắt đầu tải DOCX
const REVOKE_AFTER_MS = 60000

// Request responseType blob: khi lỗi, thân phản hồi cũng là Blob (chứa JSON { message }),
// getErrorMessage không đọc được nên phải đọc Blob ra trước
async function readErrorMessage(err) {
  const data = err && err.response && err.response.data
  if (data instanceof Blob) {
    try {
      const body = JSON.parse(await data.text())
      if (body && body.message) return body.message
    } catch {
      // Không phải JSON: dùng câu mặc định bên dưới
    }
  }
  return getErrorMessage(err, 'Không mở được file CV, vui lòng thử lại')
}

// Mở file CV gốc qua API có token (thư mục upload không phục vụ dạng file tĩnh).
// cv = { id, fileName, fileType }: PDF mở tab mới để xem, DOCX tải về với tên file gốc.
// Lỗi thì throw Error có câu báo của API (vd "Không tìm thấy file CV") để trang tự hiển thị
export async function openCvFile({ id, fileName, fileType }) {
  const isPdf = fileType === 'PDF'
  // Mở tab ngay trong lúc người dùng bấm, trước khi chờ tải file: mở sau await thì trình duyệt chặn popup
  const tab = isPdf ? window.open('', '_blank') : null
  if (tab) {
    // Tab mới không truy cập ngược được trang này
    tab.opener = null
  }

  try {
    const blob = await getCVFile(id)
    const url = URL.createObjectURL(blob)
    if (isPdf) {
      if (tab) {
        tab.location.href = url
      } else if (!window.open(url, '_blank', 'noopener')) {
        // Trình duyệt chặn cả tab trống lẫn tab mở thẳng object URL: báo rõ thay vì im lặng không có gì xảy ra
        URL.revokeObjectURL(url)
        throw new Error('Trình duyệt đã chặn mở tab mới. Hãy cho phép cửa sổ bật lên cho trang này rồi thử lại.')
      }
    } else {
      const link = document.createElement('a')
      link.href = url
      link.download = fileName || 'cv.docx'
      document.body.appendChild(link)
      link.click()
      link.remove()
    }
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS)
  } catch (err) {
    if (tab) tab.close()
    throw new Error(await readErrorMessage(err))
  }
}
