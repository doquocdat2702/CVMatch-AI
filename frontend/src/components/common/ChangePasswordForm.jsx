import { useState } from 'react'
import { changePassword } from '../../api/auth.api'
import { getErrorMessage } from '../../utils/apiError'
import { MIN_PASSWORD_LENGTH } from '../../utils/validation'
import Button from './Button'
import Input from './Input'
import styles from './ChangePasswordForm.module.css'

const EMPTY_FORM = { oldPassword: '', newPassword: '', confirmPassword: '' }

// Quy tắc giống trang đăng ký: mật khẩu mới đủ độ dài, xác nhận phải khớp
function validate(form) {
  const errors = {}
  if (!form.oldPassword) {
    errors.oldPassword = 'Vui lòng nhập mật khẩu hiện tại'
  }
  if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`
  }
  if (form.confirmPassword !== form.newPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp'
  }
  return errors
}

// Mục "Đổi mật khẩu" dùng chung cho mọi role (ứng viên, nhà tuyển dụng, quản trị viên):
// backend đổi mật khẩu cho chính tài khoản đang đăng nhập
function ChangePasswordForm() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    setSuccess(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess(false)

    const errors = validate(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword })
      setSuccess(true)
      // Xóa trắng form để mật khẩu không nằm lại trên màn hình
      setForm(EMPTY_FORM)
    } catch (err) {
      // Mật khẩu hiện tại sai, mật khẩu mới trùng mật khẩu cũ... lấy câu báo từ backend
      setError(getErrorMessage(err, 'Đổi mật khẩu thất bại, vui lòng thử lại'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.section}>
      <h2>Đổi mật khẩu</h2>

      {success && (
        <p className={styles.alertSuccess} role="status">
          Đã đổi mật khẩu
        </p>
      )}
      {error && (
        <p className={styles.alertError} role="alert">
          {error}
        </p>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          label="Mật khẩu hiện tại"
          name="oldPassword"
          type="password"
          autoComplete="current-password"
          required
          value={form.oldPassword}
          onChange={handleChange}
          error={fieldErrors.oldPassword}
          disabled={submitting}
        />
        <Input
          label="Mật khẩu mới"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự`}
          value={form.newPassword}
          onChange={handleChange}
          error={fieldErrors.newPassword}
          disabled={submitting}
        />
        <Input
          label="Xác nhận mật khẩu mới"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirmPassword}
          onChange={handleChange}
          error={fieldErrors.confirmPassword}
          disabled={submitting}
        />

        <div className={styles.actions}>
          <Button type="submit" loading={submitting}>
            {submitting ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
          </Button>
        </div>
      </form>
    </section>
  )
}

export default ChangePasswordForm
