// Lấy câu báo lỗi backend trả về ({ success: false, message }),
// không có thì dùng câu mặc định
export function getErrorMessage(error, fallback = 'Có lỗi xảy ra, vui lòng thử lại') {
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message
  }
  // Gửi được request nhưng không có phản hồi: backend chưa chạy hoặc mất mạng
  if (error.request && !error.response) {
    return 'Không kết nối được máy chủ, vui lòng thử lại sau'
  }
  return fallback
}
