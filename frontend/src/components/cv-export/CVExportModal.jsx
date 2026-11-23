import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { getMyProfile } from '../../api/candidate.api'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/apiError'
import { LINK_FIELDS, WEB_LINK_MAX_LENGTH, checkWebLink } from '../../utils/webLink'
import Button from '../common/Button'
import Input from '../common/Input'
import Loading from '../common/Loading'
import Modal from '../common/Modal'
import Textarea from '../common/Textarea'
import CVTemplateClassic from './CVTemplateClassic'
import CVTemplateModern from './CVTemplateModern'
import CVTemplateProfessional from './CVTemplateProfessional'
import { buildCVData, hasUnconfirmedItems } from './cvData'
import styles from './CVExportModal.module.css'

// bleed: mẫu tự lo lề trang (mẫu Chuyên nghiệp in lề 0, cột trái chạm mép), khung xem trước không thêm lề 15mm
const TEMPLATES = [
  { id: 'classic', name: 'Cổ điển', description: 'Một cột, dễ in đen trắng', Component: CVTemplateClassic },
  { id: 'modern', name: 'Hiện đại', description: 'Hai cột, liên hệ và kỹ năng bên trái', Component: CVTemplateModern },
  {
    id: 'professional',
    name: 'Chuyên nghiệp',
    description: 'Hai cột, cột trái nền tối có ảnh',
    Component: CVTemplateProfessional,
    bleed: true,
  },
]

// Class gắn lên body trong lúc modal mở. CSS in chỉ ẩn trang và chỉ in CV khi body có class này,
// nên in các trang khác của hệ thống vẫn như bình thường
const PRINTING_CLASS = 'cv-printing'
const PRINT_AREA_CLASS = 'cv-print-area'

// Giới hạn ô chữ khớp trang Hồ sơ (backend chỉ áp khi lưu hồ sơ; ở đây chỉ để bản in không bị chữ quá dài)
const OBJECTIVE_MAX_LENGTH = 1000
const SKILL_MAX_LENGTH = 100
// T35m: GitHub / LinkedIn nằm giữa Số điện thoại và Địa chỉ, đúng thứ tự in trên CV; kiểm cùng quy tắc với trang Hồ sơ
const TEXT_FIELDS = [
  { name: 'fullName', label: 'Họ và tên', maxLength: 255, autoComplete: 'name' },
  { name: 'headline', label: 'Tiêu đề hồ sơ', maxLength: 255 },
  { name: 'email', label: 'Email', type: 'email', maxLength: 255, autoComplete: 'email' },
  { name: 'phone', label: 'Số điện thoại', type: 'tel', maxLength: 50, autoComplete: 'tel' },
  ...LINK_FIELDS.map((field) => ({
    ...field,
    type: 'url',
    inputMode: 'url',
    autoComplete: 'url',
    maxLength: WEB_LINK_MAX_LENGTH,
    hint: `Ví dụ: ${field.example}`,
    isLink: true,
  })),
  { name: 'address', label: 'Địa chỉ', maxLength: 255, autoComplete: 'street-address' },
]

// ===== Bản chỉnh sửa cho lần xuất này (T35l) =====
// Chỉ nằm trong state của hộp: không gọi API lưu, không localStorage. Đóng hộp là mất.
// Kỹ năng lấy theo đúng danh sách tên mà CV in ra (buildCVData đã bỏ trùng), để ô tích khớp với bản in.
function makeDraft(profile) {
  const cv = buildCVData(profile)
  return {
    fullName: profile.fullName || '',
    headline: profile.headline || '',
    email: profile.email || '',
    phone: profile.phone || '',
    githubUrl: profile.githubUrl || '',
    linkedinUrl: profile.linkedinUrl || '',
    address: profile.address || '',
    objective: profile.objective || '',
    skills: cv.skills.map((name) => ({ id: `goc:${name.toLowerCase()}`, name, checked: true, added: false })),
    hiddenExperienceIds: [],
    hiddenEducationIds: [],
  }
}

// Hồ sơ đưa cho mẫu CV = hồ sơ gốc + chỉnh sửa. Mẫu CV vẫn chỉ gọi buildCVData nên cả 3 mẫu dùng chung một bộ dữ liệu
function applyDraft(profile, draft) {
  const hiddenExperiences = new Set(draft.hiddenExperienceIds)
  const hiddenEducations = new Set(draft.hiddenEducationIds)
  return {
    ...profile,
    fullName: draft.fullName.trim(),
    headline: draft.headline.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    githubUrl: draft.githubUrl.trim(),
    linkedinUrl: draft.linkedinUrl.trim(),
    address: draft.address.trim(),
    objective: draft.objective,
    skills: draft.skills.filter((skill) => skill.checked).map((skill) => ({ rawName: skill.name })),
    experiences: (profile.experiences || []).filter((experience) => !hiddenExperiences.has(experience.id)),
    educations: (profile.educations || []).filter((education) => !hiddenEducations.has(education.id)),
  }
}

function toggleId(ids, id) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}

// ===== Xem trước =====
// Dựng CV trên trang A4 thật (210mm). zoom 'fit': thu nhỏ vừa bề ngang khung bằng transform, khung cuộn dọc khi CV
// dài; zoom 'actual': cỡ thật (chữ 14px như bản in), khung cuộn cả ngang lẫn dọc. Đo lại khi khung đổi bề ngang
// hoặc CV đổi chiều cao (đang gõ). Khung cuộn là phần tử cha của sizer
function CVPreview({ bleed, zoom, children }) {
  const sizerRef = useRef(null)
  const pageRef = useRef(null)
  const [size, setSize] = useState({ scale: 0, width: 0, height: 0 })

  useLayoutEffect(() => {
    const frame = sizerRef.current.parentElement
    const page = pageRef.current
    const update = () => {
      if (!page.offsetWidth || !frame.clientWidth) return
      // Vừa khung chỉ thu nhỏ, không phóng to quá cỡ thật (khung rộng hơn A4 khi hộp xếp dọc ở 900px)
      const scale = zoom === 'actual' ? 1 : Math.min(1, frame.clientWidth / page.offsetWidth)
      setSize({
        scale,
        width: Math.ceil(page.offsetWidth * scale),
        height: Math.ceil(page.offsetHeight * scale),
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(frame)
    observer.observe(page)
    return () => observer.disconnect()
  }, [zoom])

  return (
    <div
      className={styles.previewSizer}
      ref={sizerRef}
      style={{ width: zoom === 'actual' ? size.width || undefined : undefined, height: size.height || undefined }}
    >
      <div
        ref={pageRef}
        className={bleed ? `${styles.previewPage} ${styles.previewPageBleed}` : styles.previewPage}
        style={{ transform: `scale(${size.scale})` }}
      >
        {children}
      </div>
    </div>
  )
}

// Trang ParsedCV chỉ render component này khi bấm "Xuất CV" ({exportOpen && <CVExportModal />}),
// nên mỗi lần mở là một lần tạo mới: state về mặc định và hồ sơ được lấy lại từ đầu.
function CVExportModal({ onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const previewId = useId()
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [templateId, setTemplateId] = useState('classic')
  const [draft, setDraft] = useState(null)
  const [addingSkill, setAddingSkill] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [skillError, setSkillError] = useState('')
  // Dưới 900px phần xem trước thu gọn, bấm nút mới mở (trên màn hình rộng luôn hiện)
  const [previewOpen, setPreviewOpen] = useState(false)
  // Cỡ xem trước: 'fit' vừa khung (mặc định) | 'actual' cỡ thật để đọc chữ
  const [zoom, setZoom] = useState('fit')
  // Hộp xác nhận: { type: 'close', to?: đường dẫn sẽ chuyển tới } | { type: 'reset' } | null
  const [confirm, setConfirm] = useState(null)
  // Ô liên kết đã rời khỏi ít nhất một lần (hoặc đã bấm In): mới hiện lỗi, để không báo lỗi khi đang gõ dở
  const [touchedLinks, setTouchedLinks] = useState([])
  const newSkillRef = useRef(null)
  const addSkillButtonRef = useRef(null)
  const skillCounter = useRef(0)

  // Lấy GET /candidates/me để CV khớp với dữ liệu vừa sửa ở trang ParsedCV; kèm ảnh (?avatar=1) cho mẫu Chuyên nghiệp,
  // ảnh là data URI nằm sẵn trong trang nên bản in không phải tải thêm gì
  useEffect(() => {
    let ignore = false
    getMyProfile({ withAvatar: true })
      .then((result) => {
        if (!ignore) setProfileData(result.data)
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, 'Không tải được hồ sơ để xuất CV.'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [reloadKey])

  // Có class này trên body thì CSS in mới ẩn trang và chỉ in CV; đóng modal thì gỡ ra
  useEffect(() => {
    document.body.classList.add(PRINTING_CLASS)
    return () => document.body.classList.remove(PRINTING_CLASS)
  }, [])

  // API hồ sơ không có email, lấy email của tài khoản đang đăng nhập (đã có từ /auth/me)
  const email = user ? user.email : ''
  const profile = useMemo(() => (profileData ? { ...profileData, email } : null), [profileData, email])
  // Bản gốc để so "có thay đổi chưa" và để Khôi phục; bản đang sửa tạo từ bản gốc khi hồ sơ vừa tải xong
  const original = useMemo(() => (profile ? makeDraft(profile) : null), [profile])
  const current = draft || original
  const dirty = Boolean(draft && original && JSON.stringify(draft) !== JSON.stringify(original))
  const cvProfile = profile && current ? applyDraft(profile, current) : null
  // Danh sách mục để tích chọn: cùng thứ tự với bản in (mới nhất trước)
  const sourceCV = useMemo(() => (profile ? buildCVData(profile) : null), [profile])

  const selected = TEMPLATES.find((template) => template.id === templateId)
  const SelectedTemplate = selected.Component
  const nameMissing = Boolean(current && !current.fullName.trim())
  // Lỗi của từng ô liên kết theo giá trị đang sửa (T35m). Liên kết sai không lên bản xem trước (buildCVData bỏ dòng)
  const linkErrors = {}
  if (current) {
    for (const field of LINK_FIELDS) {
      const message = checkWebLink(current[field.name], field)
      if (message) linkErrors[field.name] = message
    }
  }
  const hasLinkError = Object.keys(linkErrors).length > 0

  function handleRetry() {
    setError('')
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  function update(changes) {
    setDraft((prev) => ({ ...(prev || original), ...changes }))
  }

  function handleFieldChange(event) {
    update({ [event.target.name]: event.target.value })
  }

  function toggleSkill(id) {
    update({ skills: current.skills.map((skill) => (skill.id === id ? { ...skill, checked: !skill.checked } : skill)) })
  }

  function openAddSkill() {
    setAddingSkill(true)
    setSkillError('')
    // Ô nhập vừa hiện ra ở lần render sau
    requestAnimationFrame(() => newSkillRef.current && newSkillRef.current.focus())
  }

  function closeAddSkill() {
    setAddingSkill(false)
    setNewSkill('')
    setSkillError('')
    requestAnimationFrame(() => addSkillButtonRef.current && addSkillButtonRef.current.focus())
  }

  function addSkill() {
    const name = newSkill.trim().replace(/\s+/g, ' ')
    if (!name) {
      setSkillError('Vui lòng nhập tên kỹ năng.')
      return
    }
    if (current.skills.some((skill) => skill.name.toLowerCase() === name.toLowerCase())) {
      setSkillError('Kỹ năng này đã có trong danh sách.')
      return
    }
    skillCounter.current += 1
    update({ skills: [...current.skills, { id: `them:${skillCounter.current}`, name, checked: true, added: true }] })
    setNewSkill('')
    setSkillError('')
  }

  // Enter trong ô kỹ năng mới thì thêm luôn (không có form bao ngoài nên không gửi gì đi)
  function handleNewSkillKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addSkill()
    }
  }

  function removeSkill(id) {
    update({ skills: current.skills.filter((skill) => skill.id !== id) })
  }

  // Đóng hộp (nút Đóng, Esc, bấm ra ngoài): có thay đổi thì hỏi trước. Đang mở hộp xác nhận thì để hộp đó tự xử lý
  // (Esc đóng hộp xác nhận, không đóng hộp Xuất CV)
  function requestClose() {
    if (confirm) return
    if (dirty) setConfirm({ type: 'close' })
    else onClose()
  }

  // Link Hồ sơ / Kết quả phân tích CV: chuyển trang thì hộp đóng, nên cũng hỏi khi có thay đổi
  function handleLinkClick(event, to) {
    if (dirty) {
      event.preventDefault()
      setConfirm({ type: 'close', to })
    } else {
      onClose()
    }
  }

  function confirmDiscard() {
    const to = confirm && confirm.to
    setConfirm(null)
    onClose()
    if (to) navigate(to)
  }

  function confirmReset() {
    setDraft(null)
    setTouchedLinks([])
    setAddingSkill(false)
    setNewSkill('')
    setSkillError('')
    setConfirm(null)
  }

  function handleLinkBlur(event) {
    const { name } = event.target
    setTouchedLinks((prev) => (prev.includes(name) ? prev : [...prev, name]))
  }

  function handlePrint() {
    // Liên kết đang sai: hiện lỗi dưới ô, không in (bản in sẽ thiếu dòng đó mà người dùng không biết)
    if (hasLinkError) {
      setTouchedLinks(LINK_FIELDS.map((field) => field.name))
      return
    }
    // Trình duyệt lấy tiêu đề trang làm tên file PDF mặc định: đặt tạm "CV - Họ tên" rồi trả lại.
    // window.print() chờ tới khi hộp thoại in đóng mới chạy tiếp
    const previousTitle = document.title
    document.title = `CV - ${cvProfile.fullName}`
    window.print()
    document.title = previousTitle
  }

  const printedSkills = current ? current.skills.filter((skill) => skill.checked).length : 0

  return (
    <>
      <Modal
        open
        wide
        onClose={requestClose}
        title="Xuất CV"
        footer={
          <>
            {/* T35l: gộp dòng nguồn dữ liệu của T35k vào đây (một dòng duy nhất, hai link) */}
            {cvProfile && (
              <p className={styles.footNote}>
                Thay đổi chỉ dùng cho lần xuất này. Vào{' '}
                <Link
                  className={styles.noteLink}
                  to="/candidate/profile"
                  onClick={(event) => handleLinkClick(event, '/candidate/profile')}
                >
                  Hồ sơ
                </Link>{' '}
                hoặc{' '}
                <Link
                  className={styles.noteLink}
                  to="/candidate/cvs/parsed"
                  onClick={(event) => handleLinkClick(event, '/candidate/cvs/parsed')}
                >
                  Kết quả phân tích CV
                </Link>{' '}
                để sửa lâu dài.
              </p>
            )}
            <Button variant="secondary" onClick={requestClose}>
              Đóng
            </Button>
            <Button onClick={handlePrint} disabled={!cvProfile || nameMissing}>
              In / Lưu PDF
            </Button>
          </>
        }
      >
        {loading && <Loading text="Đang tải hồ sơ..." />}

        {!loading && error && (
          <>
            <p className={styles.alertError} role="alert">
              {error}
            </p>
            <Button variant="secondary" onClick={handleRetry}>
              Thử lại
            </Button>
          </>
        )}

        {!loading && !error && cvProfile && (
          <div className={styles.body}>
            {/* Vẫn cho xuất, không lọc bỏ mục chưa xác nhận: chỉ nhắc kiểm tra */}
            {hasUnconfirmedItems(profile) && (
              <p className={styles.warning} role="status">
                Hồ sơ còn mục chưa xác nhận.
              </p>
            )}

            <fieldset className={styles.choices}>
              <legend className={styles.legend}>Mẫu CV</legend>
              <div className={styles.options}>
                {TEMPLATES.map((template) => (
                  <label
                    key={template.id}
                    className={
                      template.id === templateId ? `${styles.option} ${styles.optionSelected}` : styles.option
                    }
                  >
                    <span className={styles.optionName}>
                      <input
                        type="radio"
                        name="cv-template"
                        value={template.id}
                        checked={template.id === templateId}
                        onChange={() => setTemplateId(template.id)}
                        className={styles.radio}
                      />
                      {template.name}
                    </span>
                    <span className={styles.optionDesc}>{template.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={styles.layout}>
              {/* ===== Bên trái: chỉnh sửa cho lần xuất này ===== */}
              <div className={styles.editor}>
                <div className={styles.editorHead}>
                  <h3 className={styles.editorTitle}>Nội dung bản in</h3>
                  <Button variant="secondary" size="sm" onClick={() => setConfirm({ type: 'reset' })} disabled={!dirty}>
                    Khôi phục dữ liệu gốc
                  </Button>
                </div>

                <fieldset className={styles.group}>
                  <legend className={styles.groupTitle}>Thông tin cá nhân</legend>
                  {TEXT_FIELDS.map((field) => (
                    <Input
                      key={field.name}
                      label={field.label}
                      name={field.name}
                      type={field.type || 'text'}
                      maxLength={field.maxLength}
                      autoComplete={field.autoComplete}
                      inputMode={field.inputMode}
                      hint={field.hint}
                      value={current[field.name]}
                      onChange={handleFieldChange}
                      onBlur={field.isLink ? handleLinkBlur : undefined}
                      error={
                        field.isLink
                          ? (touchedLinks.includes(field.name) && linkErrors[field.name]) || ''
                          : field.name === 'fullName' && nameMissing
                            ? 'Vui lòng nhập họ và tên để in CV.'
                            : ''
                      }
                    />
                  ))}
                  <Textarea
                    label="Mục tiêu nghề nghiệp"
                    name="objective"
                    rows={4}
                    maxLength={OBJECTIVE_MAX_LENGTH}
                    value={current.objective}
                    onChange={handleFieldChange}
                    hint={`Còn ${OBJECTIVE_MAX_LENGTH - current.objective.length} ký tự.`}
                  />
                </fieldset>

                <fieldset className={styles.group}>
                  <legend className={styles.groupTitle}>
                    Kỹ năng{' '}
                    <span className={styles.groupCount}>
                      ({printedSkills}/{current.skills.length} được in)
                    </span>
                  </legend>
                  {current.skills.length > 0 ? (
                    <ul className={styles.checkChips}>
                      {current.skills.map((skill) => (
                        <li key={skill.id} className={styles.checkChip}>
                          <label className={styles.checkChipLabel}>
                            <input
                              type="checkbox"
                              className={styles.checkbox}
                              checked={skill.checked}
                              onChange={() => toggleSkill(skill.id)}
                            />
                            {skill.name}
                          </label>
                          {skill.added && (
                            <button
                              type="button"
                              className={styles.removeSkill}
                              onClick={() => removeSkill(skill.id)}
                              aria-label={`Xóa kỹ năng ${skill.name}`}
                            >
                              Xóa
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.emptyText}>Hồ sơ chưa có kỹ năng.</p>
                  )}

                  {addingSkill ? (
                    <div className={styles.addSkill}>
                      <Input
                        ref={newSkillRef}
                        label="Tên kỹ năng mới"
                        name="newSkill"
                        maxLength={SKILL_MAX_LENGTH}
                        value={newSkill}
                        onChange={(event) => {
                          setNewSkill(event.target.value)
                          setSkillError('')
                        }}
                        onKeyDown={handleNewSkillKeyDown}
                        error={skillError}
                        hint="Chỉ dùng cho bản in này, không lưu vào hồ sơ."
                        className={styles.addSkillInput}
                      />
                      <div className={styles.addSkillActions}>
                        <Button size="sm" onClick={addSkill}>
                          Thêm
                        </Button>
                        <Button variant="secondary" size="sm" onClick={closeAddSkill}>
                          Xong
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button ref={addSkillButtonRef} variant="secondary" size="sm" onClick={openAddSkill}>
                      Thêm kỹ năng
                    </Button>
                  )}
                </fieldset>

                <p className={styles.groupNote}>
                  Kinh nghiệm và học vấn chỉ chọn in hay không; muốn sửa nội dung, vào trang Kết quả phân tích CV.
                </p>

                <fieldset className={styles.group}>
                  <legend className={styles.groupTitle}>Kinh nghiệm làm việc</legend>
                  {sourceCV.experiences.length > 0 ? (
                    <ul className={styles.checkList}>
                      {sourceCV.experiences.map((experience) => (
                        <li key={experience.id}>
                          <label className={styles.checkItem}>
                            <input
                              type="checkbox"
                              className={styles.checkbox}
                              checked={!current.hiddenExperienceIds.includes(experience.id)}
                              onChange={() =>
                                update({ hiddenExperienceIds: toggleId(current.hiddenExperienceIds, experience.id) })
                              }
                            />
                            <span className={styles.checkText}>
                              <span className={styles.checkTitle}>{experience.position || 'Chưa có vị trí'}</span>
                              {(experience.companyName || experience.period) && (
                                <span className={styles.checkSub}>
                                  {[experience.companyName, experience.period].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.emptyText}>Hồ sơ chưa có kinh nghiệm.</p>
                  )}
                </fieldset>

                <fieldset className={styles.group}>
                  <legend className={styles.groupTitle}>Học vấn</legend>
                  {sourceCV.educations.length > 0 ? (
                    <ul className={styles.checkList}>
                      {sourceCV.educations.map((education) => (
                        <li key={education.id}>
                          <label className={styles.checkItem}>
                            <input
                              type="checkbox"
                              className={styles.checkbox}
                              checked={!current.hiddenEducationIds.includes(education.id)}
                              onChange={() =>
                                update({ hiddenEducationIds: toggleId(current.hiddenEducationIds, education.id) })
                              }
                            />
                            <span className={styles.checkText}>
                              <span className={styles.checkTitle}>{education.school || 'Chưa có tên trường'}</span>
                              {(education.detail || education.period) && (
                                <span className={styles.checkSub}>
                                  {[education.detail, education.period].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.emptyText}>Hồ sơ chưa có học vấn.</p>
                  )}
                </fieldset>
              </div>

              {/* ===== Bên phải: xem trước, cập nhật ngay khi gõ ===== */}
              <section className={styles.previewPane} aria-label="Xem trước CV">
                <button
                  type="button"
                  className={styles.previewToggle}
                  aria-expanded={previewOpen}
                  aria-controls={previewId}
                  onClick={() => setPreviewOpen((open) => !open)}
                >
                  {previewOpen ? 'Thu gọn xem trước' : 'Mở xem trước'}
                </button>
                {/* Vừa khung để thấy cả trang; Cỡ thật để đọc chữ (chữ trong khung vừa khung chỉ còn ~5-7px) */}
                <div
                  className={previewOpen ? styles.zoomBar : `${styles.zoomBar} ${styles.previewCollapsed}`}
                  role="group"
                  aria-label="Cỡ xem trước"
                >
                  {[
                    { id: 'fit', label: 'Vừa khung' },
                    { id: 'actual', label: 'Cỡ thật' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={zoom === option.id ? `${styles.zoomButton} ${styles.zoomActive}` : styles.zoomButton}
                      aria-pressed={zoom === option.id}
                      onClick={() => setZoom(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {/* Khung cuộn được nên nhận focus bằng Tab để cuộn bằng phím mũi tên. Nội dung bên trong là bản sao
                    của CV sẽ in, ẩn với trình đọc màn hình (đã đọc được các ô chỉnh sửa bên trái) */}
                <div
                  id={previewId}
                  className={previewOpen ? styles.previewFrame : `${styles.previewFrame} ${styles.previewCollapsed}`}
                  tabIndex={0}
                  role="region"
                  aria-label={`Xem trước mẫu ${selected.name}`}
                >
                  <div aria-hidden="true">
                    <CVPreview key={templateId} bleed={selected.bleed} zoom={zoom}>
                      <SelectedTemplate profile={cvProfile} />
                    </CVPreview>
                  </div>
                </div>
                <p className={styles.note}>
                  Trong hộp thoại in, chọn khổ A4, "Lưu dưới dạng PDF" và bỏ chọn "Đầu trang và chân trang".
                </p>
              </section>
            </div>
          </div>
        )}
      </Modal>

      {/* Hộp xác nhận: đóng hộp khi đang có thay đổi, hoặc khôi phục dữ liệu gốc */}
      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm && confirm.type === 'reset' ? 'Khôi phục dữ liệu gốc?' : 'Bỏ các thay đổi cho bản in?'}
        footer={
          confirm && confirm.type === 'reset' ? (
            <>
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                Hủy
              </Button>
              <Button onClick={confirmReset}>Khôi phục</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                Tiếp tục chỉnh sửa
              </Button>
              <Button variant="danger" onClick={confirmDiscard}>
                Bỏ thay đổi
              </Button>
            </>
          )
        }
      >
        <p className={styles.confirmText}>
          {confirm && confirm.type === 'reset'
            ? 'Mọi chỉnh sửa cho bản in này sẽ bị bỏ, CV trở về đúng dữ liệu hồ sơ hiện tại.'
            : 'Các chỉnh sửa bạn vừa làm cho bản in này sẽ mất. Hồ sơ của bạn không bị ảnh hưởng.'}
        </p>
      </Modal>

      {/* Vùng in: gắn thẳng vào body, ẩn trên màn hình, chỉ hiện khi in (CVExportModal.module.css) */}
      {cvProfile &&
        createPortal(
          <div className={`${PRINT_AREA_CLASS} ${styles.printArea}`}>
            <SelectedTemplate profile={cvProfile} />
          </div>,
          document.body,
        )}
    </>
  )
}

export default CVExportModal
