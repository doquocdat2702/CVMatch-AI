import { useEffect, useState } from 'react'
import { getMyProfile, updateMyProfile } from '../../api/candidate.api'
import Button from '../../components/common/Button'
import ChangePasswordForm from '../../components/common/ChangePasswordForm'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import { getErrorMessage } from '../../utils/apiError'
import styles from './Profile.module.css'

// 4 trường ứng viên tự sửa; maxLength khớp độ dài cột trong database
const FIELDS = [
  { name: 'fullName', label: 'Họ và tên', required: true, maxLength: 255, autoComplete: 'name' },
  { name: 'phone', label: 'Số điện thoại', type: 'tel', maxLength: 50, autoComplete: 'tel' },
  { name: 'address', label: 'Địa chỉ', maxLength: 255, autoComplete: 'street-address' },
  {
    name: 'headline',
    label: 'Tiêu đề hồ sơ',
    maxLength: 255,
    hint: 'Một dòng giới thiệu bản thân, ví dụ: Kế toán tổng hợp, 3 năm kinh nghiệm',
  },
]

const EMPTY_FORM = { fullName: '', phone: '', address: '', headline: '' }

// Chỉ lấy 4 trường cần dùng, null đổi thành chuỗi rỗng để đưa vào ô nhập
function pickFields(profile) {
  return {
    fullName: profile.fullName || '',
    phone: profile.phone || '',
    address: profile.address || '',
    headline: profile.headline || '',
  }
}

function Profile() {
  const [profile, setProfile] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  // Tăng số này để tải lại hồ sơ (nút Thử lại)
  const [reloadKey, setReloadKey] = useState(0)

  // Chế độ sửa: form là bản nháp, chỉ ghi vào profile khi lưu thành công
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let ignore = false
    getMyProfile()
      .then((result) => {
        if (!ignore) setProfile(pickFields(result.data))
      })
      .catch((err) => {
        if (!ignore) setLoadError(getErrorMessage(err, 'Không tải được hồ sơ'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [reloadKey])

  function handleRetry() {
    setLoadError('')
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  function startEdit() {
    setForm(profile)
    setFieldErrors({})
    setSaveError('')
    setSaved(false)
    setEditing(true)
  }

  // Hủy: bỏ bản nháp, hồ sơ giữ nguyên như trước khi sửa
  function cancelEdit() {
    setEditing(false)
    setSaveError('')
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaveError('')

    const fullName = form.fullName.trim()
    if (!fullName) {
      setFieldErrors({ fullName: 'Vui lòng nhập họ và tên' })
      return
    }

    setSaving(true)
    try {
      // Gửi cả 4 trường: trường để trống thì backend xóa giá trị cũ
      const result = await updateMyProfile({
        fullName,
        phone: form.phone.trim(),
        address: form.address.trim(),
        headline: form.headline.trim(),
      })
      setProfile(pickFields(result.data))
      setEditing(false)
      setSaved(true)
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Lưu hồ sơ thất bại, vui lòng thử lại'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Loading text="Đang tải hồ sơ..." />
  }

  if (loadError) {
    return (
      <>
        <h1>Hồ sơ</h1>
        <p className={styles.alertError} role="alert">
          {loadError}
        </p>
        <Button variant="secondary" onClick={handleRetry}>
          Thử lại
        </Button>
      </>
    )
  }

  return (
    <>
      <h1>Hồ sơ</h1>
      <p className={styles.intro}>Nhà tuyển dụng xem các thông tin này khi bạn ứng tuyển.</p>

      {saved && (
        <p className={styles.alertSuccess} role="status">
          Đã lưu hồ sơ.
        </p>
      )}

      {editing ? (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {saveError && (
            <p className={styles.alertError} role="alert">
              {saveError}
            </p>
          )}

          {FIELDS.map((field) => (
            <Input
              key={field.name}
              label={field.label}
              name={field.name}
              type={field.type || 'text'}
              required={field.required}
              maxLength={field.maxLength}
              autoComplete={field.autoComplete}
              hint={field.hint}
              value={form[field.name]}
              onChange={handleChange}
              error={fieldErrors[field.name]}
              disabled={saving}
            />
          ))}

          <div className={styles.actions}>
            <Button type="submit" loading={saving}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
              Hủy
            </Button>
          </div>
        </form>
      ) : (
        <>
          <dl className={styles.details}>
            {FIELDS.map((field) => (
              <div key={field.name}>
                <dt className={styles.term}>{field.label}</dt>
                <dd className={styles.value}>
                  {profile[field.name] || <span className={styles.empty}>Chưa cập nhật</span>}
                </dd>
              </div>
            ))}
          </dl>
          <Button onClick={startEdit}>Sửa hồ sơ</Button>
        </>
      )}

      <ChangePasswordForm />
    </>
  )
}

export default Profile
