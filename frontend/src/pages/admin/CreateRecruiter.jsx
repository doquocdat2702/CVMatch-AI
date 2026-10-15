import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createRecruiter, getCompany } from '../../api/admin.api'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import { getErrorMessage } from '../../utils/apiError'
import { MIN_PASSWORD_LENGTH, isValidEmail } from '../../utils/validation'
import styles from './CreateRecruiter.module.css'

const EMPTY_FORM = { email: '', password: '', confirmPassword: '', fullName: '', phone: '', position: '' }

// Cùng quy tắc với backend (admin.service.js createRecruiter) để báo lỗi ngay trên form
function validate(form) {
  const errors = {}
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
  if (!form.fullName.trim()) {
    errors.fullName = 'Vui lòng nhập họ và tên'
  }
  return errors
}

// Cấp tài khoản cho HR nội bộ (Recruiter không tự đăng ký được).
// Hệ thống phục vụ một công ty: tài khoản mới tự gán vào công ty đó, không có ô chọn công ty.
function CreateRecruiter() {
  // Tên công ty chỉ để hiển thị; tải lỗi vẫn cho tạo, backend tự gán đúng công ty
  const [company, setCompany] = useState({ loading: true, name: '', error: '' })

  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Tài khoản vừa tạo: { email, fullName, companyName }
  const [created, setCreated] = useState(null)

  useEffect(() => {
    let ignore = false
    getCompany()
      .then((result) => {
        if (!ignore) setCompany({ loading: false, name: result.data.name, error: '' })
      })
      .catch((err) => {
        if (!ignore) setCompany({ loading: false, name: '', error: getErrorMessage(err, 'Không tải được tên công ty') })
      })
    return () => {
      ignore = true
    }
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setCreated(null)

    const errors = validate(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      // phone, position để trống thì backend lưu null
      const result = await createRecruiter({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        position: form.position.trim(),
      })
      const companyName = result.data.company ? result.data.company.name : company.name
      setCreated({ email: result.data.email, fullName: result.data.fullName, companyName })
      // Xóa trắng form để tạo tiếp tài khoản khác, mật khẩu không nằm lại trên màn hình
      setForm(EMPTY_FORM)
      window.scrollTo(0, 0)
    } catch (err) {
      // Email đã được sử dụng, chưa cấu hình công ty... lấy câu báo từ backend
      setError(getErrorMessage(err, 'Tạo tài khoản thất bại, vui lòng thử lại'))
    } finally {
      setSubmitting(false)
    }
  }

  let companyValue
  if (company.loading) {
    companyValue = <span className={styles.muted}>Đang tải...</span>
  } else if (company.error) {
    companyValue = <span className={styles.errorText}>{company.error}</span>
  } else {
    companyValue = company.name
  }

  return (
    <>
      <h1>Tạo tài khoản Recruiter</h1>
      <p className={styles.intro}>
        Cấp tài khoản cho nhân viên tuyển dụng (HR) của công ty. Sau khi tạo, hãy gửi email và mật khẩu cho nhân viên qua
        kênh nội bộ; họ đổi lại mật khẩu trong trang Hồ sơ.
      </p>

      {created && (
        <div className={styles.alertSuccess} role="status">
          <p className={styles.alertText}>
            Đã tạo tài khoản cho {created.fullName} ({created.email}), thuộc công ty {created.companyName}.
          </p>
          <Link className={styles.link} to="/admin/users?role=RECRUITER">
            Xem danh sách nhà tuyển dụng
          </Link>
        </div>
      )}

      {/* Công ty: chỉ đọc, hệ thống một công ty */}
      <dl className={styles.details}>
        <div>
          <dt className={styles.term}>Công ty</dt>
          <dd className={styles.value}>
            {companyValue}
            <span className={styles.readonlyNote}>Tài khoản mới tự gán vào công ty duy nhất của hệ thống</span>
          </dd>
        </div>
      </dl>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {error && (
          <p className={styles.alertError} role="alert">
            {error}
          </p>
        )}

        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="off"
          required
          maxLength={191}
          hint="Email dùng để đăng nhập"
          value={form.email}
          onChange={handleChange}
          error={fieldErrors.email}
          disabled={submitting}
        />
        <Input
          label="Mật khẩu"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự`}
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
          disabled={submitting}
        />
        <Input
          label="Xác nhận mật khẩu"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirmPassword}
          onChange={handleChange}
          error={fieldErrors.confirmPassword}
          disabled={submitting}
        />
        <Input
          label="Họ và tên"
          name="fullName"
          autoComplete="off"
          required
          maxLength={255}
          value={form.fullName}
          onChange={handleChange}
          error={fieldErrors.fullName}
          disabled={submitting}
        />
        <Input
          label="Số điện thoại"
          name="phone"
          type="tel"
          autoComplete="off"
          maxLength={50}
          value={form.phone}
          onChange={handleChange}
          disabled={submitting}
        />
        <Input
          label="Chức vụ"
          name="position"
          maxLength={255}
          hint="Ví dụ: Chuyên viên tuyển dụng"
          value={form.position}
          onChange={handleChange}
          disabled={submitting}
        />

        <div className={styles.actions}>
          <Button type="submit" loading={submitting}>
            {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
          </Button>
        </div>
      </form>
    </>
  )
}

export default CreateRecruiter
