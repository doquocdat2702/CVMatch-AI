import { extractCV, parseCV, uploadCV } from '../api/cv.api'

// Khớp kiểm tra của backend (upload.middleware.js): chỉ PDF, DOCX và tối đa 5MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx']
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Kiểm tra ngay tại trình duyệt, trả câu lỗi hoặc chuỗi rỗng nếu hợp lệ
export function validateCvFile(file) {
  const name = file.name.toLowerCase()
  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return 'Chỉ nhận file PDF (.pdf) hoặc Word (.docx)'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File vượt quá 5MB'
  }
  return ''
}

export const CV_UPLOAD_STEP_TEXT = {
  upload: 'Bước 1/3: Đang tải CV lên...',
  extract: 'Bước 2/3: Đang trích xuất nội dung...',
  parse: 'Bước 3/3: Đang phân tích...',
}

// Tải CV lên rồi phân tích luôn, dùng chung API với trang CV của tôi (T35f, hộp ứng tuyển).
// onStep(bước) báo tiến trình; lỗi ở bước nào thì throw kèm step để nơi gọi ghi rõ lỗi ở đâu
export async function uploadAndAnalyzeCv(file, onStep) {
  let step = 'upload'
  try {
    onStep(step)
    const uploaded = await uploadCV(file)
    step = 'extract'
    onStep(step)
    await extractCV(uploaded.data.id)
    step = 'parse'
    onStep(step)
    await parseCV(uploaded.data.id)
    return uploaded.data
  } catch (err) {
    err.step = step
    throw err
  }
}
