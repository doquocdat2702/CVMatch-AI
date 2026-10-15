import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import ProtectedRoute from './ProtectedRoute'
import MainLayout from '../components/layout/MainLayout'
import PublicLayout from '../components/layout/PublicLayout'
import { useAuth } from '../hooks/useAuth'
import JobBoard from '../pages/candidate/JobBoard'
import JobDetail from '../pages/candidate/JobDetail'
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import ForgotPassword from '../pages/auth/ForgotPassword'
import ResetPassword from '../pages/auth/ResetPassword'
import Forbidden from '../pages/errors/Forbidden'
import NotFound from '../pages/errors/NotFound'
import Profile from '../pages/candidate/Profile'
import CVUpload from '../pages/candidate/CVUpload'
import ParsedCV from '../pages/candidate/ParsedCV'
import RecommendedJobs from '../pages/candidate/RecommendedJobs'
import MatchingDetail from '../pages/candidate/MatchingDetail'
import MyApplications from '../pages/candidate/MyApplications'
import RecruiterProfile from '../pages/recruiter/Profile'
import Company from '../pages/recruiter/Company'
import JobList from '../pages/recruiter/JobList'
import JobForm from '../pages/recruiter/JobForm'
import ParsedJD from '../pages/recruiter/ParsedJD'
import RecommendedCandidates from '../pages/recruiter/RecommendedCandidates'
import Applications from '../pages/recruiter/Applications'
import RecruiterDashboard from '../pages/recruiter/Dashboard'
import AdminDashboard from '../pages/admin/Dashboard'
import AccountList from '../pages/admin/AccountList'
import CreateRecruiter from '../pages/admin/CreateRecruiter'
import RoleManagement from '../pages/admin/RoleManagement'
import AdminProfile from '../pages/admin/Profile'
import { ROLES } from '../utils/roles'

// Bảng tin "/" và chi tiết "/jobs/:id" là trang công khai: chưa đăng nhập dùng PublicLayout
// (header gọn, không Sidebar), đã đăng nhập dùng MainLayout (Header + Sidebar theo role)
function PublicPagesLayout() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <MainLayout /> : <PublicLayout />
}

// Sửa tin: key theo mã tin để chuyển từ tin này sang tin khác (hoặc từ "tạo mới" sang "sửa")
// luôn là một lần mount mới, không giữ state của tin trước
function EditJobRoute() {
  const { id } = useParams()
  return <JobForm key={id} jobId={id} />
}

// Yêu cầu của tin: key theo mã tin, giống EditJobRoute
function RequirementsRoute() {
  const { id } = useParams()
  return <ParsedJD key={id} jobId={id} />
}

// Các route đã đăng nhập: ProtectedRoute kiểm role -> MainLayout (Header + Sidebar) -> trang con.
function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Công khai: chưa đăng nhập vẫn vào được. "/" là trang chủ (bảng tin việc làm) */}
          <Route element={<PublicPagesLayout />}>
            <Route path="/" element={<JobBoard />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
          </Route>
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
              <Route path="recommended-jobs" element={<RecommendedJobs />} />
              {/* Chi tiết đối chiếu nằm dưới /recommended-jobs nên menu "Việc làm gợi ý" vẫn được đánh dấu */}
              <Route path="recommended-jobs/:jobId" element={<MatchingDetail />} />
              <Route path="cvs" element={<CVUpload />} />
              {/* Kết quả phân tích nằm dưới /cvs nên menu "CV của tôi" vẫn được đánh dấu */}
              <Route path="cvs/parsed" element={<ParsedCV />} />
              <Route path="profile" element={<Profile />} />
              <Route path="applications" element={<MyApplications />} />
            </Route>
          </Route>

          {/* Nhà tuyển dụng */}
          <Route path="/recruiter" element={<ProtectedRoute allowedRoles={[ROLES.RECRUITER]} />}>
            {/* /recruiter (trang chính sau khi đăng nhập) tự chuyển tới Tổng quan */}
            <Route index element={<Navigate to="/recruiter/dashboard" replace />} />
            <Route element={<MainLayout />}>
              <Route path="dashboard" element={<RecruiterDashboard />} />
              <Route path="profile" element={<RecruiterProfile />} />
              <Route path="company" element={<Company />} />
              <Route path="jobs" element={<JobList />} />
              <Route path="jobs/new" element={<JobForm />} />
              <Route path="jobs/:id/edit" element={<EditJobRoute />} />
              {/* Nằm dưới /jobs nên menu "Tin tuyển dụng" vẫn được đánh dấu */}
              <Route path="jobs/:id/requirements" element={<RequirementsRoute />} />
              <Route path="recommended-candidates" element={<RecommendedCandidates />} />
              <Route path="applications" element={<Applications />} />
            </Route>
          </Route>

          {/* Quản trị viên */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
            {/* /admin (trang chính sau khi đăng nhập) tự chuyển tới Tổng quan */}
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route element={<MainLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AccountList />} />
              <Route path="recruiters/new" element={<CreateRecruiter />} />
              <Route path="roles" element={<RoleManagement />} />
              <Route path="profile" element={<AdminProfile />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default AppRouter
