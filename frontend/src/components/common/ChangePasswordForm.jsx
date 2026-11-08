import { useId, useState } from 'react'
import { changePassword } from '../../api/auth.api'
import { getErrorMessage } from '../../utils/apiError'
import { MIN_PASSWORD_LENGTH } from '../../utils/validation'
import Button from './Button'
import Input from './Input'
import styles from './ChangePasswordForm.module.css'

const EMPTY_FORM = { oldPassword: '', newPassword: '', confirmPassword: '' }

// Quy tắc giống trang đăng ký: mật khẩu mới đủ độ dài, xác nhận phải khớp.
// enhanced (T35g): kiểm thêm "khác mật khẩu cũ" ngay trên form, đúng quy tắc backend đã có (auth.service.js)
function validate(form, enhanced) {
  const errors = {}
  if (!form.oldPassword) {
    errors.oldPassword = 'Vui lòng nhập mật khẩu hiện tại.'
  }
  if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `Mật khẩu mới cần có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`
  } else if (enhanced && form.oldPassword && form.newPassword === form.oldPassword) {
    errors.newPassword = 'Mật khẩu mới cần khác mật khẩu hiện tại.'
  }
  if (form.confirmPassword !== form.newPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận chưa khớp.'
  }
  return errors
}

// Danh sách điều kiện hiện dưới ô mật khẩu mới (chỉ ở chế độ enhanced), cập nhật khi gõ.
// CHỈ gồm quy tắc đã có: độ dài tối thiểu (validation.js), khác mật khẩu cũ (backend), xác nhận khớp (form)
function getRules(form) {
  return [
    { key: 'length', text: `Ít nhất ${MIN_PASSWORD_LENGTH} ký tự`, ok: form.newPassword.length >= MIN_PASSWORD_LENGTH },
    {
      key: 'different',
      text: 'Khác mật khẩu hiện tại',
      ok: form.newPassword !== '' && form.newPassword !== form.oldPassword,
    },
    {
      key: 'match',
      text: 'Nhập lại đúng mật khẩu mới',
      ok: form.confirmPassword !== '' && form.confirmPassword === form.newPassword,
    },
  ]
}

// Ô mật khẩu có nút chữ "Hiện" / "Ẩn" (chế độ enhanced). Cùng nhãn, gợi ý, lỗi như Input dùng chung
function PasswordField({ label, name, value, onChange, error, disabled, autoComplete, describedBy }) {
  const inputId = useId()
  const errorId = `${inputId}-error`
  const [visible, setVisible] = useState(false)
  const describedByIds = [describedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
        <span className={styles.required} aria-hidden="true">
          {' '}
          *
        </span>
      </label>
      <div className={error ? `${styles.passwordBox} ${styles.invalid}` : styles.passwordBox}>
        <input
          id={inputId}
          className={styles.passwordInput}
          type={visible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedByIds}
          disabled={disabled}
        />
        {/* Tên nút là chữ đang hiện ("Hiện" / "Ẩn") + tên ô cho trình đọc màn hình; aria-pressed báo đang hiện */}
        <button
          type="button"
          className={styles.toggle}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
        >
          {visible ? 'Ẩn' : 'Hiện'}
          <span className={styles.srOnly}> {label.toLocaleLowerCase('vi')}</span>
        </button>
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}

// Form "Đổi mật khẩu" dùng chung cho mọi role (ứng viên, nhà tuyển dụng, quản trị viên):
// backend đổi mật khẩu cho chính tài khoản đang đăng nhập.
// Từ T35e form nằm ở trang riêng (pages/common/ChangePassword) có sẵn tiêu đề h1, nên không còn h2 riêng.
// enhanced (T35g, chỉ trang của ứng viên): nút Hiện / Ẩn từng ô, danh sách điều kiện cập nhật khi gõ,
// câu báo thành công rõ hơn. Không truyền thì giữ đúng giao diện cũ cho HR / Admin
function ChangePasswordForm({ enhanced = false }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const rulesId = useId()

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

    const errors = validate(form, enhanced)
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
      setError(getErrorMessage(err, 'Chưa đổi được mật khẩu. Vui lòng thử lại.'))
    } finally {
      setSubmitting(false)
    }
  }

  const successBox =
    success &&
    (enhanced ? (
      <div className={styles.successBox} role="status">
        <p className={styles.successTitle}>Đã đổi mật khẩu</p>
        <p className={styles.successText}>Dùng mật khẩu mới cho lần đăng nhập sau.</p>
      </div>
    ) : (
      <p className={styles.alertSuccess} role="status">
        Đã đổi mật khẩu.
      </p>
    ))

  const errorBox = error && (
    <p className={styles.alertError} role="alert">
      {error}
    </p>
  )

  const submitButton = (
    <div className={styles.actions}>
      <Button type="submit" loading={submitting}>
        {submitting ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
      </Button>
    </div>
  )

  if (enhanced) {
    const rules = getRules(form)
    return (
      <div className={styles.section}>
        {successBox}
        {errorBox}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <PasswordField
            label="Mật khẩu hiện tại"
            name="oldPassword"
            autoComplete="current-password"
            value={form.oldPassword}
            onChange={handleChange}
            error={fieldErrors.oldPassword}
            disabled={submitting}
          />
          <PasswordField
            label="Mật khẩu mới"
            name="newPassword"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={handleChange}
            error={fieldErrors.newPassword}
            disabled={submitting}
            describedBy={rulesId}
          />
          <PasswordField
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            disabled={submitting}
            describedBy={rulesId}
          />

          {/* Không đặt aria-live: đọc lại cả danh sách mỗi lần gõ phím rất ồn.
              Ô mật khẩu mới và ô xác nhận trỏ tới danh sách bằng aria-describedby */}
          <ul id={rulesId} className={styles.rules} aria-label="Điều kiện của mật khẩu mới">
            {rules.map((rule) => (
              <li key={rule.key} className={rule.ok ? `${styles.rule} ${styles.ruleOk}` : styles.rule}>
                <span className={styles.ruleMark} aria-hidden="true" />
                {rule.text}
                <span className={styles.srOnly}>{rule.ok ? ': đã đạt' : ': chưa đạt'}</span>
              </li>
            ))}
          </ul>

          {submitButton}
        </form>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      {successBox}
      {errorBox}

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

        {submitButton}
      </form>
    </div>
  )
}

export default ChangePasswordForm
