import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/apiError'
import { APP_NAME } from '../../utils/appConfig'
import { getRoleHome } from '../../utils/roles'
import styles from './Auth.module.css'

// Đăng nhập dùng chung cho Admin, Recruiter và Candidate
function Login() {
  const { login, isAuthenticated, role, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Thông báo do trang Đăng ký hoặc Đặt lại mật khẩu gửi sang
  const notice = location.state ? location.state.notice : ''

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Đã đăng nhập thì không cần ở trang này nữa
  if (!loading && isAuthenticated) {
    return <Navigate to={getRoleHome(role)} replace />
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const email = form.email.trim()
    if (!email || !form.password) {
      setError('Vui lòng nhập email và mật khẩu')
      return
    }

    setSubmitting(true)
    try {
      const user = await login(email, form.password)
      navigate(getRoleHome(user.role), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng nhập thất bại, vui lòng thử lại'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.loginPage}>
      {/* Khối điểm nhấn: chỉ trang đăng nhập và trang việc làm công khai được có */}
      <section className={styles.brandPanel}>
        <p className={styles.brandName}>{APP_NAME}</p>
        <p className={styles.brandText}>Phân tích CV và đối chiếu với yêu cầu của từng vị trí tuyển dụng.</p>
      </section>

      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          <h1 className={styles.title}>Đăng nhập</h1>
          <p className={styles.subtitle}>Dùng chung cho ứng viên, nhà tuyển dụng và quản trị viên.</p>

          {notice && !error && <p className={styles.alertSuccess}>{notice}</p>}
          {error && (
            <p className={styles.alertError} role="alert">
              {error}
            </p>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                className={styles.input}
                type="email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="login-password">
                  Mật khẩu
                </label>
                <Link className={styles.smallLink} to="/forgot-password">
                  Quên mật khẩu?
                </Link>
              </div>
              <input
                id="login-password"
                className={styles.input}
                type="password"
                name="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className={styles.note}>
            Chưa có tài khoản ứng viên?{' '}
            <Link className={styles.link} to="/register">
              Đăng ký
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

export default Login
