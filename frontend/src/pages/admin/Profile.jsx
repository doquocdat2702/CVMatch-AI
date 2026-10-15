import ChangePasswordForm from '../../components/common/ChangePasswordForm'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABEL } from '../../utils/roles'
import styles from './Profile.module.css'

// Hồ sơ quản trị viên: admin không có bảng hồ sơ riêng, chỉ hiện email, vai trò (lấy từ phiên đăng nhập)
// và mục đổi mật khẩu. Mật khẩu của chính admin chỉ đổi ở đây, trang Tài khoản không đặt lại được.
function AdminProfile() {
  const { user, role } = useAuth()

  return (
    <>
      <h1>Hồ sơ</h1>
      <p className={styles.intro}>Tài khoản quản trị viên của hệ thống tuyển dụng.</p>

      <dl className={styles.details}>
        <div>
          <dt className={styles.term}>Email</dt>
          <dd className={styles.value}>{user ? user.email : ''}</dd>
        </div>
        <div>
          <dt className={styles.term}>Vai trò</dt>
          <dd className={styles.value}>{ROLE_LABEL[role] || role}</dd>
        </div>
      </dl>

      <ChangePasswordForm />
      <p className={styles.note}>
        Quên mật khẩu quản trị viên: chức năng quên mật khẩu qua email chỉ dành cho ứng viên. Người quản lý máy chủ chạy
        lệnh <code className={styles.code}>node scripts/reset-admin-password.js</code> trong thư mục backend để đặt lại.
      </p>
    </>
  )
}

export default AdminProfile
