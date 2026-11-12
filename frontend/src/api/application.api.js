import axiosClient from './axiosClient'

// Ứng tuyển một job kèm CV ứng viên chọn (T35g): { jobId, cvId }. Backend chặn nếu chưa có CV đã phân tích,
// job đã đóng, đã ứng tuyển, thiếu cvId hoặc CV không thuộc ứng viên / không còn file
export async function applyJob(jobId, cvId) {
  const response = await axiosClient.post('/applications', { jobId, cvId })
  return response.data
}

// Đơn của ứng viên đang đăng nhập: data.items = [{ id, status, coverage, appliedAt, job: { id, title, companyName },
//   cv: { id, fileName, fileType } | null, cvLegacy }]. cvLegacy: đơn nộp trước khi lưu CV, cv là CV hiện tại
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

// Nhà tuyển dụng: đơn của MỌI tin mình đăng, gồm tin đã đóng (T35i). Mới nộp trước, phân trang phía server.
// data: { items: [{ id, status, coverage, appliedAt, job: { id, title, isOpen }, candidate: { id, fullName },
//   cv, cvLegacy }], pagination: { page, limit, total, totalPages }, note }
export async function getMyJobsApplications({ status, page, limit } = {}) {
  const response = await axiosClient.get('/applications/mine', { params: { status, page, limit } })
  return response.data
}

// Nhà tuyển dụng đổi trạng thái đơn: APPLIED -> REVIEWING -> ACCEPTED | REJECTED, APPLIED -> REJECTED
export async function updateApplicationStatus(id, status) {
  const response = await axiosClient.patch(`/applications/${id}/status`, { status })
  return response.data
}
