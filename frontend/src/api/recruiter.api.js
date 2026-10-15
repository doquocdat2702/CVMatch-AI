import axiosClient from './axiosClient'

// Mọi API trả về dạng { success, message, data }, các hàm dưới đây trả về response.data

// Hồ sơ nhà tuyển dụng đang đăng nhập, kèm công ty: data = { id, fullName, phone, position, companyId, company }
export async function getMyRecruiterProfile() {
  const response = await axiosClient.get('/recruiters/me')
  return response.data
}

// { fullName, phone, position }: fullName bắt buộc; công ty do quản trị viên gán, không sửa ở đây
export async function updateMyRecruiterProfile(payload) {
  const response = await axiosClient.put('/recruiters/me', payload)
  return response.data
}

// Trang Tổng quan của nhà tuyển dụng: scope 'mine' (tin của tôi, mặc định) | 'all' (toàn công ty).
// data: { scope, summary: { openJobs, totalApplications, newApplicationsLast7Days },
//         applicationsByStatus: [{ status, count }], applicationsByDay: [{ date: 'YYYY-MM-DD', count }] (30 ngày),
//         coverageDistribution: [{ range: '0-20', count }], note }
export async function getRecruiterDashboard(scope) {
  const response = await axiosClient.get('/recruiters/dashboard', { params: { scope } })
  return response.data
}
