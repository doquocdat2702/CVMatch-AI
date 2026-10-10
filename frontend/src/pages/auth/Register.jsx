import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { register } from '../../api/auth.api'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/apiError'
import { getRoleHome } from '../../utils/roles'
import { MIN_PASSWORD_LENGTH, isValidEmail } from '../../utils/validation'
import styles from './Auth.module.css'

const EMPTY_FORM = { fullName: '', email: '', password: '', confirmPassword: '' }

// Trả về object lỗi theo từng ô, rỗng nghĩa là hợp lệ
function validate(form) {
  const errors = {}
  if (!form.fullName.trim()) {
    errors.fullName = 'Vui lòng nhập họ và tên'
  }
  if (!form.email.trim()) {
    errors.email = 'Vui lòng nhập email'
  } else if (!isValidEmail(form.email.trim())) {
    errors.email = 'Email không đúng định dạng'
  }
  if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`
  }
  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp'
  }
  return errors
}

// Đăng ký chỉ dành cho ứng viên
function Register() {
  const { isAuthenticated, role, loading } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && isAuthenticated) {
    return <Navigate to={getRoleHome(role)} replace />
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // Sửa ô nào thì bỏ lỗi của ô đó
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const errors = validate(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
      })
      // API đăng ký không trả token, chuyển sang đăng nhập kèm thông báo
      navigate('/login', { state: { notice: 'Đăng ký thành công, vui lòng đăng nhập' } })
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng ký thất bại, vui lòng thử lại'))
    } finally {
      setSubmitting(false)
    }
  }

  // Tạo props chung cho một ô nhập, gắn thông báo lỗi bằng aria-describedby
  function inputProps(name) {
    const hasError = Boolean(fieldErrors[name])
    return {
      id: `register-${name}`,
      name,
      value: form[name],
      onChange: handleChange,
      disabled: submitting,
      className: hasError ? `${styles.input} ${styles.inputInvalid}` : styles.input,
      'aria-invalid': hasError,
      'aria-describedby': hasError ? `register-${name}-error` : undefined,
    }
  }

  function renderFieldError(name) {
    if (!fieldErrors[name]) return null
    return (
      <p id={`register-${name}-error`} className={styles.fieldError}>
        {fieldErrors[name]}
      </p>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Đăng ký ứng viên</h1>
        <p className={styles.subtitle}>Tạo tài khoản để tải CV và ứng tuyển vào các vị trí đang mở.</p>

        {error && (
          <p className={styles.alertError} role="alert">
            {error}
          </p>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-fullName">
              Họ và tên
            </label>
            <input type="text" autoComplete="name" {...inputProps('fullName')} />
            {renderFieldError('fullName')}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-email">
              Email
            </label>
            <input type="email" autoComplete="email" {...inputProps('email')} />
            {renderFieldError('email')}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-password">
              Mật khẩu
            </label>
            <input type="password" autoComplete="new-password" {...inputProps('password')} />
            {renderFieldError('password')}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-confirmPassword">
              Xác nhận mật khẩu
            </label>
            <input type="password" autoComplete="new-password" {...inputProps('confirmPassword')} />
            {renderFieldError('confirmPassword')}
          </div>

          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <p className={styles.note}>
          Đã có tài khoản?{' '}
          <Link className={styles.link} to="/login">
            Đăng nhập
          </Link>
        </p>
        <p className={styles.note}>Tài khoản nhà tuyển dụng do quản trị viên cấp, không đăng ký tại đây.</p>
      </div>
    </main>
  )
}

export default Register
