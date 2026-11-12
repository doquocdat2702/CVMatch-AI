import { useEffect, useState } from 'react'
import { getMyCompany, updateMyCompany } from '../../api/company.api'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import Textarea from '../../components/common/Textarea'
import PageHeader from '../../components/layout/PageHeader'
import Panel from '../../components/layout/Panel'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getErrorMessage } from '../../utils/apiError'
import styles from './Company.module.css'

// Các trường HR sửa được; maxLength khớp độ dài cột trong database (description là cột Text, không giới hạn).
// Tên công ty không nằm ở đây: cố định theo COMPANY_NAME của hệ thống (G7), chỉ hiển thị
const FIELDS = [
  { name: 'description', label: 'Giới thiệu công ty', type: 'textarea' },
  { name: 'address', label: 'Địa chỉ', maxLength: 255, autoComplete: 'street-address' },
  { name: 'website', label: 'Website', type: 'url', maxLength: 255, hint: 'Ví dụ: https://congty.vn' },
]

const EMPTY_FORM = { name: '', description: '', address: '', website: '' }

const PAGE_TITLE = 'Thông tin công ty'
const PAGE_DESCRIPTION = 'Thông tin dùng chung cho mọi nhà tuyển dụng của công ty, hiển thị trên các tin tuyển dụng.'

function pickFields(company) {
  return {
    name: company.name || '',
    description: company.description || '',
    address: company.address || '',
    website: company.website || '',
  }
}

// Website lưu tự do: chỉ biến thành link khi bắt đầu bằng http(s), tránh link lạ như "javascript:"
function isWebLink(value) {
  return /^https?:\/\//i.test(value)
}

// Hệ thống phục vụ một công ty: mọi nhà tuyển dụng cùng xem và sửa thông tin công ty này
// (PUT /companies/me sửa đúng công ty của người đang đăng nhập). Tên công ty chỉ đọc.
// T35i: nằm trong khu "Tài khoản", trình bày như trang Hồ sơ (Panel xem chỉ đọc 2 cột, "Sửa thông tin" mở form)
function Company() {
  useDocumentTitle(PAGE_TITLE)
  const [company, setCompany] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let ignore = false
    getMyCompany()
      .then((result) => {
        if (!ignore) setCompany(pickFields(result.data))
      })
      .catch((err) => {
        if (!ignore) setLoadError(getErrorMessage(err, 'Không tải được thông tin công ty.'))
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
    setForm(company)
    setFieldErrors({})
    setSaveError('')
    setSaved(false)
    setEditing(true)
  }

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

    setSaving(true)
    try {
      // Gửi 3 trường sửa được (không gửi tên): trường để trống thì backend xóa giá trị cũ
      const result = await updateMyCompany({
        description: form.description.trim(),
        address: form.address.trim(),
        website: form.website.trim(),
      })
      setCompany(pickFields(result.data))
      setEditing(false)
      setSaved(true)
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Chưa lưu được thông tin công ty. Vui lòng thử lại.'))
    } finally {
      setSaving(false)
    }
  }

  function renderValue(field) {
    const value = company[field.name]
    if (!value) return <span className={styles.empty}>Chưa cập nhật</span>
    if (field.name === 'website' && isWebLink(value)) {
      return (
        <a className={styles.link} href={value} target="_blank" rel="noopener noreferrer">
          {value}
        </a>
      )
    }
    return value
  }

  if (loading) {
    return <Loading text="Đang tải thông tin công ty..." />
  }

  if (loadError) {
    return (
      <>
        <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <p className={styles.alertError} role="alert">
          {loadError}
        </p>
        <Button variant="secondary" onClick={handleRetry}>
          Thử lại
        </Button>
      </>
    )
  }

  // Tên công ty: chỉ đọc ở cả chế độ xem lẫn chế độ sửa
  const nameValue = (
    <>
      {company.name}
      <span className={styles.readonlyNote}>Tên công ty được thiết lập sẵn, không sửa tại đây</span>
    </>
  )

  return (
    <>
      <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />

      {saved && (
        <p className={styles.alertSuccess} role="status">
          Đã lưu thông tin công ty.
        </p>
      )}

      <Panel title="Thông tin chung">
        {editing ? (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {saveError && (
              <p className={styles.alertError} role="alert">
                {saveError}
              </p>
            )}

            <div className={styles.readonlyField}>
              <span className={styles.term}>Tên công ty</span>
              <span className={styles.value}>{nameValue}</span>
            </div>

            {FIELDS.map((field) =>
              field.type === 'textarea' ? (
                <Textarea
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  rows={6}
                  value={form[field.name]}
                  onChange={handleChange}
                  disabled={saving}
                />
              ) : (
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
              ),
            )}

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
              <div className={styles.wide}>
                <dt className={styles.term}>Tên công ty</dt>
                <dd className={styles.value}>{nameValue}</dd>
              </div>
              {/* Tên, giới thiệu chiếm cả hàng; địa chỉ, website mỗi ô một cột */}
              {FIELDS.map((field) => (
                <div key={field.name} className={field.type === 'textarea' ? styles.wide : undefined}>
                  <dt className={styles.term}>{field.label}</dt>
                  <dd className={field.type === 'textarea' ? `${styles.value} ${styles.multiline}` : styles.value}>
                    {renderValue(field)}
                  </dd>
                </div>
              ))}
            </dl>
            <Button onClick={startEdit}>Sửa thông tin</Button>
          </>
        )}
      </Panel>
    </>
  )
}

export default Company
