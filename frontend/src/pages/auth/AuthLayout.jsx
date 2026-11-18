import Logo from '../../components/layout/Logo'
import { APP_NAME } from '../../utils/appConfig'
import styles from './Auth.module.css'

// Bố cục hai nửa dùng chung cho Đăng nhập, Đăng ký, Quên mật khẩu, Đặt lại mật khẩu (T35j, trước chỉ có ở Đăng nhập):
// nửa trái Xanh mực có tên hệ thống + một câu, nửa phải có Logo + nội dung (tiêu đề, form).
// Dưới 900px nửa Xanh mực thu thành dải trên cùng (Auth.module.css)
function AuthLayout({ children }) {
  return (
    <main className={styles.loginPage}>
      <section className={styles.brandPanel}>
        <p className={styles.brandName}>{APP_NAME}</p>
        <p className={styles.brandText}>Phân tích CV và đối chiếu với yêu cầu của từng vị trí tuyển dụng.</p>
      </section>

      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          {/* Logo trên nền Giấy (khối Xanh mực giữ tên lớn): nhận diện + đường quay về trang chủ */}
          <div className={styles.formLogo}>
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}

export default AuthLayout
