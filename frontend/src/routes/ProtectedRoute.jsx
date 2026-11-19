import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from '../pages/auth/Auth.module.css'

// Bọc các route cần đăng nhập.
// allowedRoles: danh sách role được vào, bỏ trống thì chỉ cần đăng nhập.
// Dùng được cả 2 cách: bọc trực tiếp (children) hoặc làm route cha (Outlet).
function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, role, loading } = useAuth()
  const location = useLocation()

  // Đang khôi phục phiên bằng getMe, chưa biết đã đăng nhập hay chưa
  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.muted}>Đang tải...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    // Gửi kèm trang đang mở để đăng nhập xong quay lại đúng trang này, giữ cả bộ lọc trên URL (QA-03)
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/403" replace />
  }

  return children ?? <Outlet />
}

export default ProtectedRoute
