import axiosClient from './axiosClient'

// Chi tiết một tin tuyển dụng (API công khai): tiêu đề, mô tả JD, địa điểm, công ty, trạng thái mở / đóng
export async function getJobDetail(id) {
  const response = await axiosClient.get(`/jobs/${id}`)
  return response.data
}

// Danh sách tin đang mở (API công khai), mới đăng trước: { page, limit }
// data: { items: [{ id, title, location, createdAt, company: { id, name } }], pagination: { page, limit, total, totalPages } }
export async function getJobs({ page, limit } = {}) {
  const response = await axiosClient.get('/jobs', { params: { page, limit } })
  return response.data
}
