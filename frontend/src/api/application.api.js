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
