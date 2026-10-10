import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../api/auth.api'
import { getErrorMessage } from '../../utils/apiError'
import { isValidEmail } from '../../utils/validation'
import styles from './Auth.module.css'

// Luôn hiện cùng một câu dù email có tài khoản hay không,
// để người ngoài không dò được email nào đã đăng ký
const SENT_MESSAGE = 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const value = email.trim()
    if (!value) {
      setError('Vui lòng nhập email')
      return
    }
    if (!isValidEmail(value)) {
      setError('Email không đúng định dạng')
      return
    }

    setSubmitting(true)
    try {
      await forgotPassword({ email: value })
      setSent(true)
    } catch (err) {
      // Chỉ lỗi không liên quan tới email mới tới đây: gửi quá nhiều lần, mất kết nối...
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Quên mật khẩu</h1>

        {sent ? (
          <p className={styles.alertSuccess} role="status">
            {SENT_MESSAGE}
          </p>
        ) : (
          <>
            <p className={styles.subtitle}>Nhập email tài khoản ứng viên để nhận liên kết đặt lại mật khẩu.</p>

            {error && (
              <p className={styles.alertError} role="alert">
                {error}
              </p>
            )}

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="forgot-email">
                  Email
                </label>
                <input
                  id="forgot-email"
                  className={styles.input}
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={submitting}
                />
              </div>

              <button className={styles.button} type="submit" disabled={submitting}>
                {submitting ? 'Đang gửi...' : 'Gửi hướng dẫn'}
              </button>
            </form>
          </>
        )}

        <p className={styles.note}>Nhà tuyển dụng quên mật khẩu vui lòng liên hệ quản trị viên.</p>
        <p className={styles.note}>
          <Link className={styles.link} to="/login">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </main>
  )
}

export default ForgotPassword
