import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../../api/auth.api'
import { getErrorMessage } from '../../utils/apiError'
import { MIN_PASSWORD_LENGTH } from '../../utils/validation'
import styles from './Auth.module.css'

const INVALID_LINK = 'Link không hợp lệ hoặc đã hết hạn'

// Mở từ liên kết trong email: /reset-password?token=...
function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [error, setError] = useState('')
  // Link hỏng thì ẩn form, chỉ còn đường gửi lại yêu cầu
  const [linkInvalid, setLinkInvalid] = useState(!token)
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`)
      return
    }
    if (form.confirmPassword !== form.newPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword({ token, newPassword: form.newPassword })
      navigate('/login', {
        replace: true,
        state: { notice: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập bằng mật khẩu mới' },
      })
    } catch (err) {
      // Mật khẩu đã kiểm ở trên theo đúng quy tắc backend,
      // nên lỗi 400 ở đây là do token sai, hết hạn hoặc đã dùng
      if (err.response && err.response.status === 400) {
        setLinkInvalid(true)
      }
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (linkInvalid) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Đặt lại mật khẩu</h1>
          <p className={styles.alertError} role="alert">
            {error || INVALID_LINK}
          </p>
          <div className={styles.actions}>
            <Link className={styles.button} to="/forgot-password">
              Gửi lại liên kết
            </Link>
            <Link className={`${styles.button} ${styles.buttonSecondary}`} to="/login">
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Đặt lại mật khẩu</h1>
        <p className={styles.subtitle}>Nhập mật khẩu mới cho tài khoản ứng viên của bạn.</p>

        {error && (
          <p className={styles.alertError} role="alert">
            {error}
          </p>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reset-newPassword">
              Mật khẩu mới
            </label>
            <input
              id="reset-newPassword"
              className={styles.input}
              type="password"
              name="newPassword"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="reset-confirmPassword">
              Xác nhận mật khẩu mới
            </label>
            <input
              id="reset-confirmPassword"
              className={styles.input}
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default ResetPassword
