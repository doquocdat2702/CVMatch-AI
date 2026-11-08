import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { getMyProfile, updateMyProfile } from '../../api/candidate.api'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import PageHeader from '../../components/layout/PageHeader'
import Panel from '../../components/layout/Panel'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getErrorMessage } from '../../utils/apiError'
import { formatMonthYear } from '../../utils/format'
import { PROFILE_SOURCE_LABEL } from '../../utils/labels'
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
const EMPTY_DETAILS = { skills: [], experiences: [], educations: [] }

const PAGE_DESCRIPTION = 'Nhà tuyển dụng xem các thông tin này khi bạn ứng tuyển.'

// Chỉ lấy 4 trường cần dùng, null đổi thành chuỗi rỗng để đưa vào ô nhập
function pickFields(profile) {
  return {
    fullName: profile.fullName || '',
    phone: profile.phone || '',
    address: profile.address || '',
    headline: profile.headline || '',
  }
}

// Mới nhất trước; mục không có ngày bắt đầu xếp cuối
function byStartDesc(a, b) {
  const left = a.startDate ? new Date(a.startDate).getTime() : -Infinity
  const right = b.startDate ? new Date(b.startDate).getTime() : -Infinity
  return right - left
}

// "03/2020 – 12/2022", đang làm (không có ngày kết thúc) thì "03/2020 – hiện tại"
function formatPeriod(item) {
  if (!item.startDate) return ''
  return `${formatMonthYear(item.startDate)} – ${item.endDate ? formatMonthYear(item.endDate) : 'hiện tại'}`
}

// Khối rỗng của Kỹ năng / Kinh nghiệm / Học vấn: một câu hướng dẫn + link sang trang CV
function EmptyGuide({ text }) {
  return (
    <div className={styles.emptyGuide}>
      <p className={styles.emptyText}>{text}</p>
      <Link className={styles.guideLink} to="/candidate/cvs">
        Tải CV và phân tích
      </Link>
    </div>
  )
}

// Link chỉnh dữ liệu đọc từ CV: các khối ở trang này chỉ đọc, sửa ở trang Kết quả phân tích CV
const EDIT_PARSED_LINK = (
  <Link className={styles.editLink} to="/candidate/cvs/parsed">
    Chỉnh sửa ở Kết quả phân tích CV
  </Link>
)

// Trang Hồ sơ trong khu Tài khoản (T35g): Thông tin cá nhân (sửa được, email chỉ đọc) và 3 khối chỉ đọc
// lấy từ dữ liệu hồ sơ hiện có (GET /candidates/me): Kỹ năng (chip, nhãn nguồn), Kinh nghiệm, Học vấn (dòng thời gian)
function Profile() {
  useDocumentTitle('Hồ sơ')
  // Họ tên trên nút tài khoản (AccountMenu) lấy từ AuthContext: lưu xong thì cập nhật để nút đổi tên ngay
  const { user, setProfileName } = useAuth()
  // Khung tóm tắt của khu Tài khoản: lưu xong thì đếm lại mục hồ sơ
  const account = useOutletContext()
  const [profile, setProfile] = useState(EMPTY_FORM)
  const [details, setDetails] = useState(EMPTY_DETAILS)
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
        if (ignore) return
        setProfile(pickFields(result.data))
        setDetails({
          skills: result.data.skills || [],
          experiences: [...(result.data.experiences || [])].sort(byStartDesc),
          educations: [...(result.data.educations || [])].sort(byStartDesc),
        })
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
      // Gửi cả 4 trường: trường để trống thì backend xóa giá trị cũ
      const result = await updateMyProfile({
        fullName,
        phone: form.phone.trim(),
        address: form.address.trim(),
        headline: form.headline.trim(),
      })
      setProfile(pickFields(result.data))
      setProfileName((result.data.fullName || '').trim())
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

            {/* Email đăng nhập chỉ đọc: hiện để ứng viên biết nhà tuyển dụng liên hệ qua địa chỉ nào */}
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
            </dl>
            <Button onClick={startEdit}>Sửa thông tin</Button>
          </>
        )}
      </Panel>

      <Panel title="Kỹ năng">
        {details.skills.length === 0 ? (
          <EmptyGuide text="Hồ sơ chưa có kỹ năng. Tải CV lên và phân tích để bổ sung." />
        ) : (
          <>
            <ul className={styles.chips}>
              {details.skills.map((skill) => (
                <li key={skill.id} className={styles.chip}>
                  <span className={styles.chipName}>{skill.rawName}</span>
                  {PROFILE_SOURCE_LABEL[skill.source] && (
                    <span className={styles.chipSource}>{PROFILE_SOURCE_LABEL[skill.source]}</span>
                  )}
                </li>
              ))}
            </ul>
            {EDIT_PARSED_LINK}
          </>
        )}
      </Panel>

      <Panel title="Kinh nghiệm">
        {details.experiences.length === 0 ? (
          <EmptyGuide text="Hồ sơ chưa có kinh nghiệm. Bạn có thể phân tích CV hoặc tự thêm ở trang Kết quả phân tích CV." />
        ) : (
          <>
            <ol className={styles.timeline}>
              {details.experiences.map((item) => (
                <li key={item.id} className={styles.timelineItem}>
                  <p className={styles.itemTitle}>{item.position}</p>
                  {item.companyName && <p className={styles.itemSub}>{item.companyName}</p>}
                  {formatPeriod(item) && <p className={styles.itemPeriod}>{formatPeriod(item)}</p>}
                  {item.description && <p className={styles.itemText}>{item.description}</p>}
                </li>
              ))}
            </ol>
            {EDIT_PARSED_LINK}
          </>
        )}
      </Panel>

      <Panel title="Học vấn">
        {details.educations.length === 0 ? (
          <EmptyGuide text="Hồ sơ chưa có học vấn. Bạn có thể phân tích CV hoặc tự thêm ở trang Kết quả phân tích CV." />
        ) : (
          <>
            <ol className={styles.timeline}>
              {details.educations.map((item) => (
                <li key={item.id} className={styles.timelineItem}>
                  <p className={styles.itemTitle}>{item.school}</p>
                  {(item.major || item.degree) && (
                    <p className={styles.itemSub}>{[item.degree, item.major].filter(Boolean).join(', ')}</p>
                  )}
                  {formatPeriod(item) && <p className={styles.itemPeriod}>{formatPeriod(item)}</p>}
                </li>
              ))}
            </ol>
            {EDIT_PARSED_LINK}
          </>
        )}
      </Panel>
    </>
  )
}

export default Profile
