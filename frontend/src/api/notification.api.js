import axiosClient from './axiosClient'

// Thông báo của chính người đang đăng nhập (ứng viên, nhà tuyển dụng). Trả về response.data dạng { success, message, data }

// Mới nhất trước: { page, limit } (mặc định 1 / 10).
// data: { items: [{ id, type, message, applicationId, isRead, createdAt }], pagination: { page, limit, total, totalPages } }
// type: NEW_APPLICATION (gửi nhà tuyển dụng) | APPLICATION_STATUS_CHANGED (gửi ứng viên)
export async function getNotifications({ page, limit } = {}) {
  const response = await axiosClient.get('/notifications', { params: { page, limit } })
  return response.data
}

// Số thông báo chưa đọc: data = { count }
export async function getUnreadCount() {
  const response = await axiosClient.get('/notifications/unread-count')
  return response.data
}

// Đánh dấu một thông báo đã đọc (đã đọc rồi thì backend trả nguyên trạng)
export async function markAsRead(id) {
  const response = await axiosClient.patch(`/notifications/${id}/read`)
  return response.data
}

// Đánh dấu tất cả đã đọc: data = { count } là số thông báo vừa được đánh dấu
export async function markAllAsRead() {
  const response = await axiosClient.patch('/notifications/read-all')
  return response.data
}
