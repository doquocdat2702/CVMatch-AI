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

// ===== Nhà tuyển dụng (cần đăng nhập RECRUITER) =====

// { title, description, location }: title và description (JD) bắt buộc
export async function createJob(payload) {
  const response = await axiosClient.post('/jobs', payload)
  return response.data
}

// Tin do chính nhà tuyển dụng này đăng (cả tin đã đóng), mỗi tin kèm applicationCount
export async function getMyJobs() {
  const response = await axiosClient.get('/jobs/my')
  return response.data
}

// Chỉ người đăng tin được sửa. data kèm requireReparse = true khi JD thay đổi
export async function updateJob(id, payload) {
  const response = await axiosClient.put(`/jobs/${id}`, payload)
  return response.data
}

// Đóng tin: ngừng nhận đơn, không mở lại được
export async function closeJob(id) {
  const response = await axiosClient.patch(`/jobs/${id}/close`)
  return response.data
}

// Xóa tin: chỉ được khi tin chưa có đơn ứng tuyển
export async function deleteJob(id) {
  const response = await axiosClient.delete(`/jobs/${id}`)
  return response.data
}

// Phân tích JD, ghi đè toàn bộ yêu cầu cũ. data = { requirements, mode, unresolvedCount }
export async function parseJD(id) {
  const response = await axiosClient.post(`/jobs/${id}/parse-jd`)
  return response.data
}

// ===== Yêu cầu của tin (JobRequirement) =====

export async function getRequirements(jobId) {
  const response = await axiosClient.get(`/jobs/${jobId}/requirements`)
  return response.data
}

// { rawText, normalizedName, type, minYears }
export async function createRequirement(jobId, payload) {
  const response = await axiosClient.post(`/jobs/${jobId}/requirements`, payload)
  return response.data
}

// { normalizedName, type, minYears }: rawText là câu gốc trong JD nên không sửa
export async function updateRequirement(jobId, reqId, payload) {
  const response = await axiosClient.put(`/jobs/${jobId}/requirements/${reqId}`, payload)
  return response.data
}

export async function deleteRequirement(jobId, reqId) {
  const response = await axiosClient.delete(`/jobs/${jobId}/requirements/${reqId}`)
  return response.data
}
