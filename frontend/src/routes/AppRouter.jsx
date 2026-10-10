import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import ProtectedRoute from './ProtectedRoute'
import MainLayout from '../components/layout/MainLayout'
import Home from '../pages/public/Home'
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import ForgotPassword from '../pages/auth/ForgotPassword'
import ResetPassword from '../pages/auth/ResetPassword'
import Forbidden from '../pages/errors/Forbidden'
import NotFound from '../pages/errors/NotFound'
import UnderConstruction from '../pages/common/UnderConstruction'
import { ROLES } from '../utils/roles'

// Các route đã đăng nhập: ProtectedRoute kiểm role -> MainLayout (Header + Sidebar) -> trang con.
// Mục menu chưa có trang dùng tạm UnderConstruction, các task sau thay bằng trang thật.
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

          {/* Ứng viên. Mục "Việc làm" dùng trang chung "/" */}
          <Route path="/candidate" element={<ProtectedRoute allowedRoles={[ROLES.CANDIDATE]} />}>
            {/* /candidate tự chuyển tới trang chính của ứng viên: danh sách việc làm */}
            <Route index element={<Navigate to="/" replace />} />
            <Route element={<MainLayout />}>
              {/* Việc làm gợi ý: trang của T30 */}
              <Route path="recommended-jobs" element={<UnderConstruction />} />
              <Route path="cvs" element={<UnderConstruction />} />
              <Route path="profile" element={<UnderConstruction />} />
              <Route path="applications" element={<UnderConstruction />} />
            </Route>
          </Route>

          {/* Nhà tuyển dụng */}
          <Route path="/recruiter" element={<ProtectedRoute allowedRoles={[ROLES.RECRUITER]} />}>
            {/* /recruiter tự chuyển tới Tin tuyển dụng. Đến T35c đổi sang /recruiter/dashboard */}
            <Route index element={<Navigate to="/recruiter/jobs" replace />} />
            <Route element={<MainLayout />}>
              {/* Trang tổng quan làm ở T35c, hiện chỉ chừa route */}
              <Route path="dashboard" element={<UnderConstruction />} />
              <Route path="profile" element={<UnderConstruction />} />
              <Route path="company" element={<UnderConstruction />} />
              <Route path="jobs" element={<UnderConstruction />} />
              <Route path="applications" element={<UnderConstruction />} />
            </Route>
          </Route>

          {/* Quản trị viên */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
            {/* /admin tự chuyển tới Tài khoản. Đến T35c đổi sang /admin/dashboard */}
            <Route index element={<Navigate to="/admin/users" replace />} />
            <Route element={<MainLayout />}>
              {/* Trang tổng quan làm ở T35c, hiện chỉ chừa route */}
              <Route path="dashboard" element={<UnderConstruction />} />
              <Route path="users" element={<UnderConstruction />} />
              <Route path="recruiters/new" element={<UnderConstruction />} />
              <Route path="roles" element={<UnderConstruction />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default AppRouter
