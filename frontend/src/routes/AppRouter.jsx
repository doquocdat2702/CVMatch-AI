import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import ProtectedRoute from './ProtectedRoute'
import MainLayout from '../components/layout/MainLayout'
import SiteLayout from '../components/layout/SiteLayout'
import { AdminAccountLayout, CandidateAccountLayout, RecruiterAccountLayout } from '../components/layout/AccountAreas'
import { useAuth } from '../hooks/useAuth'
import JobBoard from '../pages/candidate/JobBoard'
import JobDetail from '../pages/candidate/JobDetail'
import About from '../pages/public/About'
import Contact from '../pages/public/Contact'
import Privacy from '../pages/public/Privacy'
import Terms from '../pages/public/Terms'
import ChangePassword from '../pages/common/ChangePassword'
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import ForgotPassword from '../pages/auth/ForgotPassword'
import ResetPassword from '../pages/auth/ResetPassword'
import Forbidden from '../pages/errors/Forbidden'
import NotFound from '../pages/errors/NotFound'
import Profile from '../pages/candidate/Profile'
import CVUpload from '../pages/candidate/CVUpload'
import ParsedCV from '../pages/candidate/ParsedCV'
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

// Trang công khai ("/", "/jobs/:id", "/about", "/contact", "/privacy", "/terms"): khách và ứng viên dùng SiteLayout
// (menu ngang, không Sidebar), nhà tuyển dụng và quản trị viên giữ MainLayout (Header + Sidebar theo role)
function PublicPagesLayout() {
  const { isAuthenticated, role } = useAuth()
  return isAuthenticated && role !== ROLES.CANDIDATE ? <MainLayout /> : <SiteLayout />
}

// Chi tiết tin công khai: key theo mã tin để bấm sang tin khác (mục "Vị trí khác đang tuyển", T35f)
// là một lần mount mới, không hiện nội dung, coverage của tin trước trong lúc tải tin mới
function JobDetailRoute() {
  const { id } = useParams()
  return <JobDetail key={id} />
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

// Các route đã đăng nhập: ProtectedRoute kiểm role -> layout (SiteLayout cho ứng viên,
// MainLayout cho nhà tuyển dụng và quản trị viên) -> trang con.
function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Công khai (kể cả Chính sách bảo mật, Điều khoản): chưa đăng nhập vẫn vào được. "/" là trang chủ (bảng tin việc làm,
              ứng viên có thêm tab "Gợi ý theo CV của bạn" ở /?view=recommended) */}
          <Route element={<PublicPagesLayout />}>
            <Route path="/" element={<JobBoard />} />
            <Route path="/jobs/:id" element={<JobDetailRoute />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/403" element={<Forbidden />} />

          {/* Ứng viên. Mục "Việc làm" dùng trang chung "/", các trang riêng mở từ AccountMenu */}
          <Route path="/candidate" element={<ProtectedRoute allowedRoles={[ROLES.CANDIDATE]} />}>
            {/* /candidate tự chuyển tới trang chính của ứng viên: danh sách việc làm */}
            <Route index element={<Navigate to="/" replace />} />
            {/* Danh sách gợi ý đã thành tab trong trang Việc làm: link cũ chuyển sang tab đó */}
            <Route path="recommended-jobs" element={<Navigate to="/?view=recommended" replace />} />
            <Route element={<SiteLayout />}>
              {/* Chi tiết đối chiếu giữ đường dẫn cũ; nằm dưới /recommended-jobs/ nên mục "Việc làm" vẫn sáng */}
              <Route path="recommended-jobs/:jobId" element={<MatchingDetail />} />
              {/* Kết quả phân tích nằm dưới /cvs nên mục "CV của tôi" trong AccountMenu vẫn được đánh dấu.
                  Giữ bố cục riêng, không nằm trong khu Tài khoản (T35g) */}
              <Route path="cvs/parsed" element={<ParsedCV />} />
              {/* Khu "Tài khoản của tôi" (T35g): cột tóm tắt + menu bên trái, trang bên phải */}
              <Route element={<CandidateAccountLayout />}>
                <Route path="profile" element={<Profile />} />
                <Route path="cvs" element={<CVUpload />} />
                <Route path="applications" element={<MyApplications />} />
                <Route path="change-password" element={<ChangePassword />} />
              </Route>
            </Route>
          </Route>

          {/* Nhà tuyển dụng */}
          <Route path="/recruiter" element={<ProtectedRoute allowedRoles={[ROLES.RECRUITER]} />}>
            {/* /recruiter (trang chính sau khi đăng nhập) tự chuyển tới Tổng quan */}
            <Route index element={<Navigate to="/recruiter/dashboard" replace />} />
            <Route element={<MainLayout />}>
              <Route path="dashboard" element={<RecruiterDashboard />} />
              {/* Khu "Tài khoản" (T35i): cùng bố cục với ứng viên, nằm trong vùng nội dung của MainLayout.
                  Sidebar chỉ có một mục "Tài khoản", sáng ở cả 3 trang */}
              <Route element={<RecruiterAccountLayout />}>
                <Route path="profile" element={<RecruiterProfile />} />
                <Route path="company" element={<Company />} />
                <Route path="change-password" element={<ChangePassword />} />
              </Route>
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
              {/* Khu "Tài khoản" (T35i), như nhà tuyển dụng */}
              <Route element={<AdminAccountLayout />}>
                <Route path="profile" element={<AdminProfile />} />
                <Route path="change-password" element={<ChangePassword />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default AppRouter
