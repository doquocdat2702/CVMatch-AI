import axiosClient from './axiosClient'

// Mọi API trả về dạng { success, message, data }, các hàm dưới đây trả về response.data.
// Kết quả đối chiếu luôn kèm note: coverage chỉ là chỉ số đối chiếu, không phải điểm năng lực.

// Ứng viên: việc làm đang mở sắp theo coverage giảm dần (mặc định 10, tối đa 50).
// data: { candidate, note, items: [{ job: { id, title, companyName, location }, coverage, supported, total, note, matrix... }], message? }
// message có khi hồ sơ chưa có dữ liệu phân tích từ CV
export async function getRecommendedJobs(limit) {
  const response = await axiosClient.get('/matching/recommended-jobs', { params: { limit } })
  return response.data
}

// Ma trận yêu cầu - bằng chứng của một job với một ứng viên (candidateId là mã hồ sơ ứng viên).
// data: { job, candidate, matrix, coverage, supported, uncertain, notFound, total, note, message? }
export async function getMatchingDetail(jobId, candidateId) {
  const response = await axiosClient.get(`/matching/job/${jobId}/candidate/${candidateId}`)
  return response.data
}

// Nhà tuyển dụng: ứng viên sắp theo coverage giảm dần cho một job của công ty mình
export async function getRecommendedCandidates(jobId, limit) {
  const response = await axiosClient.get(`/matching/recommended-candidates/${jobId}`, { params: { limit } })
  return response.data
}
