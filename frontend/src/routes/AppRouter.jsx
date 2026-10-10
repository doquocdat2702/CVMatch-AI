import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { useAuth } from '../hooks/useAuth'
import ProtectedRoute from './ProtectedRoute'
import Home from '../pages/public/Home'
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import ForgotPassword from '../pages/auth/ForgotPassword'
import ResetPassword from '../pages/auth/ResetPassword'
import Forbidden from '../pages/errors/Forbidden'
import NotFound from '../pages/errors/NotFound'
import { ROLES, ROLE_LABEL } from '../utils/roles'
import styles from '../pages/auth/Auth.module.css'

// Trang giữ chỗ cho khu vực của từng role, các task sau thay bằng trang thật
function RolePlaceholder() {
  const { user, role, logout } = useAuth()

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Trang {(ROLE_LABEL[role] || '').toLowerCase()}</h1>
        <p className={styles.subtitle}>Bạn đang đăng nhập bằng {user.email}. Nội dung trang đang được xây dựng.</p>
        <div className={styles.actions}>
          <Link className={`${styles.button} ${styles.buttonSecondary}`} to="/">
            Trang chủ
          </Link>
          <button className={styles.button} type="button" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </div>
    </main>
  )
}

function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Công khai: chưa đăng nhập vẫn vào được */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/403" element={<Forbidden />} />

          {/* Ứng viên */}
          <Route path="/candidate" element={<ProtectedRoute allowedRoles={[ROLES.CANDIDATE]} />}>
            <Route index element={<RolePlaceholder />} />
          </Route>

          {/* Nhà tuyển dụng */}
          <Route path="/recruiter" element={<ProtectedRoute allowedRoles={[ROLES.RECRUITER]} />}>
            <Route index element={<RolePlaceholder />} />
          </Route>

          {/* Quản trị viên */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route index element={<RolePlaceholder />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default AppRouter
