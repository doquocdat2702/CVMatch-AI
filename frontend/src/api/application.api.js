import axiosClient from './axiosClient'

// Ứng tuyển một job: { jobId }. Backend chặn nếu chưa có CV đã phân tích, job đã đóng hoặc đã ứng tuyển
export async function applyJob(jobId) {
  const response = await axiosClient.post('/applications', { jobId })
  return response.data
}

// Đơn của ứng viên đang đăng nhập: data.items = [{ id, status, coverage, appliedAt, job: { id, title, companyName } }]
export async function getMyApplications() {
  const response = await axiosClient.get('/applications/my')
  return response.data
}

// Chi tiết một đơn (ứng viên xem đơn của mình, nhà tuyển dụng xem đơn vào job công ty mình).
// data: { id, status, appliedAt, job, candidate, coverageAtApply, coverage, supported, total, matrix, note, message? }
// Ma trận và coverage tính LẠI theo hồ sơ hiện tại; coverageAtApply là % đã lưu lúc nộp
export async function getApplicationDetail(id) {
  const response = await axiosClient.get(`/applications/${id}`)
  return response.data
}

// Ứng viên rút đơn: chỉ được khi đơn còn ở trạng thái APPLIED
export async function withdrawApplication(id) {
  const response = await axiosClient.delete(`/applications/${id}`)
  return response.data
}

// Nhà tuyển dụng: đơn của một job, lọc theo trạng thái nếu có ({ status: 'REVIEWING' })
export async function getJobApplications(jobId, { status } = {}) {
  const response = await axiosClient.get(`/applications/job/${jobId}`, { params: { status } })
  return response.data
}

// Nhà tuyển dụng đổi trạng thái đơn: APPLIED -> REVIEWING -> ACCEPTED | REJECTED, APPLIED -> REJECTED
export async function updateApplicationStatus(id, status) {
  const response = await axiosClient.patch(`/applications/${id}/status`, { status })
  return response.data
}
