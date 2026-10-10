import { useEffect, useState } from 'react'
import * as authApi from '../api/auth.api'
import { AuthContext } from './auth-context'

// 'token' phải trùng key mà axiosClient đọc để gắn header Authorization
const TOKEN_KEY = 'token'
const USER_KEY = 'user'

// Chỉ giữ thông tin tài khoản cơ bản, hồ sơ chi tiết do từng trang tự gọi API
function pickUser(user) {
  return { id: user.id, email: user.email, role: user.role }
}

// Đọc hạn (exp) trong payload JWT. Token đã hết hạn thì không gọi getMe,
// tránh nhận 401 khiến axiosClient đẩy về /login khi đang ở trang công khai
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

function readStoredSession() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token || isTokenExpired(token)) {
    return { token: null, user: null }
  }
  try {
    return { token, user: JSON.parse(localStorage.getItem(USER_KEY)) }
  } catch {
    return { token, user: null }
  }
}

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)
  // Có token thì chờ getMe xác nhận phiên rồi mới cho vào trang cần đăng nhập
  const [loading, setLoading] = useState(session.token !== null)

  // Chỉ chạy một lần khi khởi động app
  useEffect(() => {
    const { token } = readStoredSession()
    if (!token) {
      // Dọn token hết hạn hoặc user còn sót trong localStorage
      clearSession()
      return
    }

    let ignore = false
    authApi
      .getMe()
      .then((result) => {
        if (ignore) return
        const user = pickUser(result.data)
        saveSession(token, user)
        setSession({ token, user })
      })
      .catch((error) => {
        if (ignore) return
        // Server trả lỗi (token sai, tài khoản bị khóa...) thì bỏ phiên.
        // Không có phản hồi (mất mạng, backend chưa chạy) thì giữ phiên đã lưu.
        if (error.response) {
          clearSession()
          setSession({ token: null, user: null })
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  // Trả về user để trang đăng nhập điều hướng theo role
  async function login(email, password) {
    const result = await authApi.login({ email, password })
    const token = result.data.token
    const user = pickUser(result.data.user)
    saveSession(token, user)
    setSession({ token, user })
    return user
  }

  // Backend không lưu phiên, đăng xuất chỉ cần xóa token phía client
  function logout() {
    clearSession()
    setSession({ token: null, user: null })
  }

  const value = {
    user: session.user,
    token: session.token,
    role: session.user ? session.user.role : null,
    isAuthenticated: Boolean(session.token && session.user),
    loading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
