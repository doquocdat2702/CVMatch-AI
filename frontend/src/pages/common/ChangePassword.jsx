import ChangePasswordForm from '../../components/common/ChangePasswordForm'

// Trang Đổi mật khẩu dùng chung cho 3 role (T35e, tách khỏi trang Hồ sơ):
// /candidate/change-password, /recruiter/change-password, /admin/change-password.
// AppRouter đặt mỗi route dưới ProtectedRoute của đúng role và trong layout của role đó
function ChangePassword() {
  return (
    <>
      <h1>Đổi mật khẩu</h1>
      <ChangePasswordForm />
    </>
  )
}

export default ChangePassword
