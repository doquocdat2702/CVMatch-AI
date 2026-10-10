import axios from 'axios'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Gắn token vào mọi request nếu đã đăng nhập
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Route công khai: chưa đăng nhập vẫn xem được, gặp 401 thì ở yên tại chỗ
const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password']
const PUBLIC_PATTERNS = [/^\/jobs\/[^/]+$/] // /jobs/:id

function isPublicPath(pathname) {
  // Bỏ dấu / cuối (trừ trang chủ) để /login/ cũng tính là /login
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return PUBLIC_PATHS.includes(path) || PUBLIC_PATTERNS.some((pattern) => pattern.test(path))
}

// Token hết hạn hoặc không hợp lệ -> luôn xóa phiên đã lưu.
// Chỉ chuyển về /login khi đang ở route cần đăng nhập.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!isPublicPath(window.location.pathname)) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default axiosClient
