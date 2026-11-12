import ChangePasswordForm from '../../components/common/ChangePasswordForm'
import PageHeader from '../../components/layout/PageHeader'
import Panel from '../../components/layout/Panel'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

// Trang Đổi mật khẩu dùng chung cho 3 role (T35e, tách khỏi trang Hồ sơ):
// /candidate/change-password, /recruiter/change-password, /admin/change-password.
// AppRouter đặt mỗi route dưới ProtectedRoute của đúng role, trong khu "Tài khoản" của role đó.
// Từ T35i cả 3 role cùng một kiểu: tiêu đề + câu mô tả, form (Hiện / Ẩn, danh sách điều kiện) trong khối Giấy
function ChangePassword() {
  useDocumentTitle('Đổi mật khẩu')

  return (
    <>
      <PageHeader title="Đổi mật khẩu" description="Nhập mật khẩu hiện tại rồi đặt mật khẩu mới cho lần đăng nhập sau." />
      <Panel width="form">
        <ChangePasswordForm />
      </Panel>
    </>
  )
}

export default ChangePassword
