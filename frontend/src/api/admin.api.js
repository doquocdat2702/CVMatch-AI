import axiosClient from './axiosClient'

// Mọi API dưới đây chỉ dành cho ADMIN. Trả về response.data dạng { success, message, data }

// Danh sách tài khoản: { role, email, page, limit }, bỏ trống role / email thì không lọc.
// data: { items: [{ id, email, role, isActive, fullName, createdAt, updatedAt }],
//         pagination: { page, limit, total, totalPages } }
export async function getUsers({ role, email, page, limit } = {}) {
  const response = await axiosClient.get('/admin/users', { params: { role, email, page, limit } })
  return response.data
}

// Khóa (false) hoặc mở khóa (true). Khóa có hiệu lực ngay ở request tiếp theo của người đó
export async function updateUserStatus(id, isActive) {
  const response = await axiosClient.patch(`/admin/users/${id}/status`, { isActive })
  return response.data
}

// Đổi role: roleName là RECRUITER hoặc CANDIDATE (backend không cho nâng lên ADMIN).
// Chưa có hồ sơ của role mới thì backend tự tạo hồ sơ tối thiểu
export async function updateUserRole(id, roleName) {
  const response = await axiosClient.patch(`/admin/users/${id}/role`, { roleName })
  return response.data
}

// Đặt mật khẩu mới cho tài khoản khác (không dùng cho chính admin đang đăng nhập)
export async function resetUserPassword(id, newPassword) {
  const response = await axiosClient.patch(`/admin/users/${id}/password`, { newPassword })
  return response.data
}

// Xóa tài khoản. Backend chặn khi recruiter đã có tin hoặc ứng viên đã có đơn (gợi ý khóa thay vì xóa)
export async function deleteUser(id) {
  const response = await axiosClient.delete(`/admin/users/${id}`)
  return response.data
}

// Tạo tài khoản nhà tuyển dụng: { email, password, fullName, phone, position }.
// Tự gán vào công ty duy nhất. data: { id, email, fullName, company: { id, name } }
export async function createRecruiter(payload) {
  const response = await axiosClient.post('/admin/recruiters', payload)
  return response.data
}

// Công ty duy nhất của hệ thống (chỉ đọc): data = { id, name }
export async function getCompany() {
  const response = await axiosClient.get('/admin/company')
  return response.data
}

// Trang Tổng quan của quản trị viên.
// data: { usersByRole: [{ role, count }], lockedUsers, jobs: { total, open },
//         applications: { total, byStatus: [{ status, count }] }, newUsersByMonth: [{ month: 'YYYY-MM', count }] (6 tháng),
//         cvByStatus: [{ status, count }], cvSuccessRate: COMPLETED / (COMPLETED + FAILED), từ 0 đến 1 }
export async function getAdminDashboard() {
  const response = await axiosClient.get('/admin/dashboard')
  return response.data
}
