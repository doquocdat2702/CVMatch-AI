import axiosClient from './axiosClient'

// Mọi API trả về dạng { success, message, data }, các hàm dưới đây trả về response.data

// Tải CV lên: file lấy từ ô chọn file hoặc kéo thả, gửi ở field "file".
// Phải đặt lại Content-Type: axiosClient mặc định là application/json, giữ nguyên thì axios
// đổi FormData thành JSON. Đặt multipart/form-data thì axios để trình duyệt tự thêm boundary.
export async function uploadCV(file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await axiosClient.post('/cvs/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

// Danh sách CV của ứng viên, mới nhất trước (không kèm rawText)
export async function getCVs() {
  const response = await axiosClient.get('/cvs')
  return response.data
}

export async function getCVDetail(id) {
  const response = await axiosClient.get(`/cvs/${id}`)
  return response.data
}

export async function deleteCV(id) {
  const response = await axiosClient.delete(`/cvs/${id}`)
  return response.data
}

// Bước 1: trích xuất text từ file. Thành công -> status COMPLETED, lỗi -> FAILED kèm errorMessage
export async function extractCV(id) {
  const response = await axiosClient.post(`/cvs/${id}/extract`)
  return response.data
}

// Bước 2: phân tích text đã trích xuất thành kỹ năng, kinh nghiệm, học vấn trong hồ sơ
export async function parseCV(id) {
  const response = await axiosClient.post(`/cvs/${id}/parse`)
  return response.data
}
