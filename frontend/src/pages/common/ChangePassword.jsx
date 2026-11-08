import ChangePasswordForm from '../../components/common/ChangePasswordForm'
import PageHeader from '../../components/layout/PageHeader'
import Panel from '../../components/layout/Panel'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

// Trang Đổi mật khẩu dùng chung cho 3 role (T35e, tách khỏi trang Hồ sơ):
// /candidate/change-password, /recruiter/change-password, /admin/change-password.
// AppRouter đặt mỗi route dưới ProtectedRoute của đúng role và trong layout của role đó.
// siteStyle (chỉ route của ứng viên, T35f): đầu trang có câu mô tả, form nằm trong khối Giấy viền mảnh
// như các trang khác của ứng viên; từ T35g form ở chế độ enhanced (Hiện / Ẩn, danh sách điều kiện).
// HR / Admin giữ nguyên bố cục và form cũ
function ChangePassword({ siteStyle = false }) {
  // Trang HR / Admin chưa đặt tiêu đề tab riêng: giữ tên hệ thống cho đồng bộ
  useDocumentTitle(siteStyle ? 'Đổi mật khẩu' : '')

  if (!siteStyle) {
    return (
      <>
        <h1>Đổi mật khẩu</h1>
        <ChangePasswordForm />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Đổi mật khẩu" description="Nhập mật khẩu hiện tại rồi đặt mật khẩu mới cho lần đăng nhập sau." />
      <Panel width="form">
        <ChangePasswordForm enhanced />
      </Panel>
    </>
  )
}

export default ChangePassword
