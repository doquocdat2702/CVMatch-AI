import { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { deleteAvatar, getMyProfile, updateMyProfile, uploadAvatar } from '../../api/candidate.api'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import Textarea from '../../components/common/Textarea'
import PageHeader from '../../components/layout/PageHeader'
import Panel from '../../components/layout/Panel'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getErrorMessage } from '../../utils/apiError'
import { formatMonthYear } from '../../utils/format'
import { getInitials } from '../../utils/initials'
import { PROFILE_SOURCE_LABEL } from '../../utils/labels'
import { groupProfileSkills } from '../../utils/skillLabel'
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

// Mục tiêu nghề nghiệp (T35k): ô nhiều dòng, khớp giới hạn của backend
const OBJECTIVE_MAX_LENGTH = 1000

const EMPTY_FORM = { fullName: '', phone: '', address: '', headline: '', objective: '' }
const EMPTY_DETAILS = { skills: [], experiences: [], educations: [] }

// Chỉ lấy các trường ứng viên tự sửa, null đổi thành chuỗi rỗng để đưa vào ô nhập
function pickFields(profile) {
  return {
    fullName: profile.fullName || '',
    phone: profile.phone || '',
    address: profile.address || '',
    headline: profile.headline || '',
    objective: profile.objective || '',
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

  // Ảnh đại diện (T35k): data URI từ GET /candidates/me, null thì hiện vòng tròn chữ cái đầu
  const [avatar, setAvatar] = useState(null)
  const [avatarBusy, setAvatarBusy] = useState('') // 'upload' | 'delete' | ''
  const [avatarError, setAvatarError] = useState('')
  const [confirmDeleteAvatar, setConfirmDeleteAvatar] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let ignore = false
    getMyProfile({ withAvatar: true })
      .then((result) => {
        if (ignore) return
        setProfile(pickFields(result.data))
        setAvatar(result.data.avatar || null)
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
      // Gửi đủ các trường: trường để trống thì backend xóa giá trị cũ. Mục tiêu giữ xuống dòng, backend cắt khoảng trắng thừa
      const result = await updateMyProfile({
        fullName,
        phone: form.phone.trim(),
        address: form.address.trim(),
        headline: form.headline.trim(),
        objective: form.objective,
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

  // Chọn file xong thì tải lên ngay; backend kiểm định dạng (byte đầu file) và dung lượng, lỗi hiện dưới nút
  async function handleAvatarChange(event) {
    const file = event.target.files && event.target.files[0]
    // Xóa lựa chọn để chọn lại đúng file đó (sau khi báo lỗi) vẫn kích hoạt onChange
    event.target.value = ''
    if (!file) return
    setAvatarError('')
    setAvatarBusy('upload')
    try {
      const result = await uploadAvatar(file)
      setAvatar(result.data.avatar || null)
      if (account) account.refreshProfile()
    } catch (err) {
      setAvatarError(getErrorMessage(err, 'Chưa tải được ảnh. Vui lòng thử lại.'))
    } finally {
      setAvatarBusy('')
    }
  }

  async function handleAvatarDelete() {
    setAvatarError('')
    setAvatarBusy('delete')
    try {
      const result = await deleteAvatar()
      setAvatar(result.data.avatar || null)
      setConfirmDeleteAvatar(false)
      if (account) account.refreshProfile()
    } catch (err) {
      setConfirmDeleteAvatar(false)
      setAvatarError(getErrorMessage(err, 'Chưa xóa được ảnh. Vui lòng thử lại.'))
    } finally {
      setAvatarBusy('')
    }
  }

  if (loading) {
    return <Loading text="Đang tải hồ sơ..." />
  }

  if (loadError) {
    return (
      <>
        <PageHeader title="Hồ sơ" />
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
      <PageHeader title="Hồ sơ" />

      {saved && (
        <p className={styles.alertSuccess} role="status">
          Đã lưu thay đổi.
        </p>
      )}

      <Panel title="Thông tin cá nhân">
        {/* Ảnh đại diện (T35k): luôn hiện ở đầu khối, cả khi đang sửa thông tin */}
        <div className={styles.avatarRow}>
          {avatar ? (
            <img className={styles.avatarImage} src={avatar} alt="Ảnh đại diện" />
          ) : (
            <span className={styles.avatarInitials} aria-hidden="true">
              {getInitials(profile.fullName, email)}
            </span>
          )}
          <div className={styles.avatarSide}>
            <div className={styles.avatarActions}>
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                loading={avatarBusy === 'upload'}
                disabled={Boolean(avatarBusy)}
              >
                {avatarBusy === 'upload' ? 'Đang tải ảnh...' : 'Tải ảnh lên'}
              </Button>
              {avatar && (
                <Button variant="secondary" onClick={() => setConfirmDeleteAvatar(true)} disabled={Boolean(avatarBusy)}>
                  Xóa ảnh
                </Button>
              )}
            </div>
            {avatarError && (
              <p className={styles.avatarError} role="alert">
                {avatarError}
              </p>
            )}
            <p className={styles.avatarHint}>JPEG hoặc PNG, tối đa 1 MB.</p>
          </div>
          {/* Ô chọn file thật được ẩn, nút "Tải ảnh lên" mở nó. accept chỉ để lọc sẵn trong hộp chọn file;
              backend mới là nơi kiểm định dạng thật */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            hidden
            onChange={handleAvatarChange}
          />
        </div>

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

            <Textarea
              label="Mục tiêu nghề nghiệp"
              name="objective"
              rows={5}
              maxLength={OBJECTIVE_MAX_LENGTH}
              value={form.objective}
              onChange={handleChange}
              error={fieldErrors.objective}
              // Phân tích CV chỉ điền mục tiêu khi ô đang trống (không ghi đè), nên ô có nội dung thì nhắc cách lấy
              // mục tiêu từ CV mới. Nằm trong hint nên trình đọc màn hình đọc cùng bộ đếm (aria-describedby)
              hint={
                <>
                  {`Còn ${OBJECTIVE_MAX_LENGTH - form.objective.length} ký tự.`}
                  {form.objective.trim() !== '' && (
                    <span className={styles.hintLine}>
                      Xóa trống ô này rồi phân tích lại CV nếu muốn lấy mục tiêu từ CV mới.
                    </span>
                  )}
                </>
              }
              disabled={saving}
            />

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
              {/* Đoạn văn dài: chiếm cả hàng, giữ xuống dòng như lúc nhập */}
              <div className={styles.fullRow}>
                <dt className={styles.term}>Mục tiêu nghề nghiệp</dt>
                <dd className={`${styles.value} ${styles.multiline}`}>
                  {profile.objective || <span className={styles.empty}>Chưa cập nhật</span>}
                </dd>
              </div>
            </dl>
            <Button onClick={startEdit}>Sửa thông tin</Button>
          </>
        )}
      </Panel>

      <Modal
        open={confirmDeleteAvatar}
        onClose={() => setConfirmDeleteAvatar(false)}
        title="Xóa ảnh đại diện?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteAvatar(false)} disabled={avatarBusy === 'delete'}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleAvatarDelete} loading={avatarBusy === 'delete'}>
              {avatarBusy === 'delete' ? 'Đang xóa...' : 'Xóa ảnh'}
            </Button>
          </>
        }
      >
        <p className={styles.modalText}>Hồ sơ và CV xuất ra sẽ hiện chữ cái đầu của họ tên thay cho ảnh.</p>
      </Modal>

      <Panel title="Kỹ năng">
        {details.skills.length === 0 ? (
          <EmptyGuide text="Hồ sơ chưa có kỹ năng. Tải CV lên và phân tích để bổ sung." />
        ) : (
          <>
            <ul className={styles.chips}>
              {/* T35j: nhãn là tên Skill (hoặc tên đã bỏ ngoặc), phần trong ngoặc là ghi chú nhỏ; gộp mục trùng */}
              {groupProfileSkills(details.skills).map((skill) => (
                <li key={skill.key} className={styles.chip}>
                  <span className={styles.chipName}>{skill.label}</span>
                  {skill.note && <span className={styles.chipNote}>{skill.note}</span>}
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
