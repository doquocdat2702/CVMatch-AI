import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getMyRecruiterProfile, updateMyRecruiterProfile } from '../../api/recruiter.api'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import PageHeader from '../../components/layout/PageHeader'
import Panel from '../../components/layout/Panel'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getErrorMessage } from '../../utils/apiError'
import styles from './Profile.module.css'

// 3 trường nhà tuyển dụng tự sửa; maxLength khớp độ dài cột trong database
const FIELDS = [
  { name: 'fullName', label: 'Họ và tên', required: true, maxLength: 255, autoComplete: 'name' },
  { name: 'phone', label: 'Số điện thoại', type: 'tel', maxLength: 50, autoComplete: 'tel' },
  { name: 'position', label: 'Chức vụ', maxLength: 255, hint: 'Ví dụ: Chuyên viên tuyển dụng' },
]

const EMPTY_FORM = { fullName: '', phone: '', position: '' }

const PAGE_DESCRIPTION = 'Thông tin cá nhân của tài khoản nhà tuyển dụng.'

function pickFields(profile) {
  return {
    fullName: profile.fullName || '',
    phone: profile.phone || '',
    position: profile.position || '',
  }
}

// Hồ sơ nhà tuyển dụng trong khu "Tài khoản" (T35i): Panel "Thông tin cá nhân" xem chỉ đọc dạng lưới 2 cột,
// "Sửa thông tin" chuyển Panel sang form (email, công ty chỉ đọc). Công ty do hệ thống gán (G7) nên chỉ hiện tên
function RecruiterProfile() {
  useDocumentTitle('Hồ sơ')
  const { user } = useAuth()
  // Thẻ tóm tắt của khu Tài khoản: lưu xong thì đọc lại họ tên, mức đầy đủ của hồ sơ
  const account = useOutletContext()
  const [profile, setProfile] = useState(EMPTY_FORM)
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
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
    getMyRecruiterProfile()
      .then((result) => {
        if (ignore) return
        setProfile(pickFields(result.data))
        setCompanyName(result.data.company ? result.data.company.name : '')
      })
      .catch((err) => {
        if (!ignore) setLoadError(getErrorMessage(err, 'Không tải được hồ sơ.'))
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
      setFieldErrors({ fullName: 'Vui lòng nhập họ và tên.' })
      return
    }

    setSaving(true)
    try {
      // Gửi cả 3 trường: trường để trống thì backend xóa giá trị cũ
      const result = await updateMyRecruiterProfile({
        fullName,
        phone: form.phone.trim(),
        position: form.position.trim(),
      })
      setProfile(pickFields(result.data))
      setEditing(false)
      setSaved(true)
      if (account) account.refreshProfile()
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Chưa lưu được hồ sơ. Vui lòng thử lại.'))
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
        <PageHeader title="Hồ sơ" description={PAGE_DESCRIPTION} />
        <p className={styles.alertError} role="alert">
          {loadError}
        </p>
        <Button variant="secondary" onClick={handleRetry}>
          Thử lại
        </Button>
      </>
    )
  }

  const email = user ? user.email : ''
  const companyValue = companyName || <span className={styles.empty}>Chưa được gán</span>

  return (
    <>
      <PageHeader title="Hồ sơ" description={PAGE_DESCRIPTION} />

      {saved && (
        <p className={styles.alertSuccess} role="status">
          Đã lưu thay đổi.
        </p>
      )}

      <Panel title="Thông tin cá nhân">
        {editing ? (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {saveError && (
              <p className={styles.alertError} role="alert">
                {saveError}
              </p>
            )}

            <div className={styles.readonlyField}>
              <span className={styles.term}>Email</span>
              <span className={styles.value}>{email}</span>
              <span className={styles.readonlyHint}>Email dùng để đăng nhập, không đổi được ở đây.</span>
            </div>

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

            {/* Công ty: chỉ đọc ở cả chế độ xem lẫn chế độ sửa, chỉ hiện tên */}
            <div className={styles.readonlyField}>
              <span className={styles.term}>Công ty</span>
              <span className={styles.value}>{companyValue}</span>
            </div>

            <div className={styles.actions}>
              <Button type="submit" loading={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
              <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
                Hủy
              </Button>
            </div>
          </form>
        ) : (
          <>
            <dl className={styles.details}>
              <div>
                <dt className={styles.term}>Email</dt>
                <dd className={styles.value}>{email}</dd>
              </div>
              {FIELDS.map((field) => (
                <div key={field.name}>
                  <dt className={styles.term}>{field.label}</dt>
                  <dd className={styles.value}>
                    {profile[field.name] || <span className={styles.empty}>Chưa cập nhật</span>}
                  </dd>
                </div>
              ))}
              <div>
                <dt className={styles.term}>Công ty</dt>
                <dd className={styles.value}>{companyValue}</dd>
              </div>
            </dl>
            <Button onClick={startEdit}>Sửa thông tin</Button>
          </>
        )}
      </Panel>
    </>
  )
}

export default RecruiterProfile
