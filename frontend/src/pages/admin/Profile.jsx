import PageHeader from '../../components/layout/PageHeader'
import Panel from '../../components/layout/Panel'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { ROLE_LABEL } from '../../utils/roles'
import styles from './Profile.module.css'

// Hồ sơ quản trị viên trong khu "Tài khoản" (T35i): admin không có bảng hồ sơ riêng, chỉ hiện email, vai trò
// (lấy từ phiên đăng nhập; GET /auth/me không trả trạng thái tài khoản nên không có dòng Trạng thái). Không sửa được.
// Mật khẩu của chính admin chỉ đổi ở trang Đổi mật khẩu, trang Tài khoản người dùng không đặt lại được.
function AdminProfile() {
  useDocumentTitle('Hồ sơ')
  const { user, role } = useAuth()

  return (
    <>
      <PageHeader title="Hồ sơ" description="Tài khoản quản trị viên của hệ thống tuyển dụng." />

      <Panel title="Thông tin tài khoản">
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

        <p className={styles.note}>Nếu quên mật khẩu, liên hệ bộ phận kỹ thuật để đặt lại.</p>
      </Panel>
    </>
  )
}

export default AdminProfile
