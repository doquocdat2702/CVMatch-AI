import axiosClient from './axiosClient'

// Mọi API trả về dạng { success, message, data }, các hàm dưới đây trả về response.data

// ===== Hồ sơ ứng viên đang đăng nhập =====

// data: hồ sơ kèm skills, experiences, educations
export async function getMyProfile() {
  const response = await axiosClient.get('/candidates/me')
  return response.data
}

// { fullName, phone, address, headline }: fullName bắt buộc, các trường còn lại để trống thì xóa
export async function updateMyProfile(payload) {
  const response = await axiosClient.put('/candidates/me', payload)
  return response.data
}

// ===== Kỹ năng: { rawName, evidence } =====

export async function createSkill(payload) {
  const response = await axiosClient.post('/candidates/me/skills', payload)
  return response.data
}

export async function updateSkill(id, payload) {
  const response = await axiosClient.put(`/candidates/me/skills/${id}`, payload)
  return response.data
}

export async function deleteSkill(id) {
  const response = await axiosClient.delete(`/candidates/me/skills/${id}`)
  return response.data
}

// ===== Kinh nghiệm: { position, companyName, startDate, endDate, description, evidence } =====

export async function createExperience(payload) {
  const response = await axiosClient.post('/candidates/me/experiences', payload)
  return response.data
}

export async function updateExperience(id, payload) {
  const response = await axiosClient.put(`/candidates/me/experiences/${id}`, payload)
  return response.data
}

export async function deleteExperience(id) {
  const response = await axiosClient.delete(`/candidates/me/experiences/${id}`)
  return response.data
}

// ===== Học vấn: { school, major, degree, startDate, endDate } =====

export async function createEducation(payload) {
  const response = await axiosClient.post('/candidates/me/educations', payload)
  return response.data
}

export async function updateEducation(id, payload) {
  const response = await axiosClient.put(`/candidates/me/educations/${id}`, payload)
  return response.data
}

export async function deleteEducation(id) {
  const response = await axiosClient.delete(`/candidates/me/educations/${id}`)
  return response.data
}
