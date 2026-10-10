import axiosClient from './axiosClient'

// Mọi API trả về dạng { success, message, data }, các hàm dưới đây trả về response.data

// Đăng ký tài khoản ứng viên: { email, password, fullName }
export async function register(payload) {
  const response = await axiosClient.post('/auth/register', payload)
  return response.data
}

// Đăng nhập dùng chung 3 role: { email, password } -> data: { token, user }
export async function login(payload) {
  const response = await axiosClient.post('/auth/login', payload)
  return response.data
}

// Thông tin tài khoản đang đăng nhập (token gắn tự động trong axiosClient)
export async function getMe() {
  const response = await axiosClient.get('/auth/me')
  return response.data
}

// Đổi mật khẩu: { oldPassword, newPassword }
export async function changePassword(payload) {
  const response = await axiosClient.put('/auth/change-password', payload)
  return response.data
}

// Quên mật khẩu (chỉ ứng viên): { email }
export async function forgotPassword(payload) {
  const response = await axiosClient.post('/auth/forgot-password', payload)
  return response.data
}

// Đặt lại mật khẩu bằng token trong link email: { token, newPassword }
export async function resetPassword(payload) {
  const response = await axiosClient.post('/auth/reset-password', payload)
  return response.data
}
