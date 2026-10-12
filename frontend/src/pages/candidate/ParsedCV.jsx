import { useEffect, useState } from 'react'
import {
  createEducation,
  createExperience,
  createSkill,
  deleteEducation,
  deleteExperience,
  deleteSkill,
  getMyProfile,
  updateEducation,
  updateExperience,
  updateSkill,
} from '../../api/candidate.api'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import Textarea from '../../components/common/Textarea'
import { getErrorMessage } from '../../utils/apiError'
import { formatMonthYear, toMonthInput } from '../../utils/format'
import styles from './ParsedCV.module.css'

// Mục chưa xác nhận dùng màu vàng của Badge (nhóm "chưa chắc chắn")
const UNCONFIRMED_STATUS = 'UNCERTAIN'

const FORM_ID = 'parsed-item-form'

// Cấu hình từng nhóm: các ô nhập trong Modal, cách đổi bản ghi thành form, API thêm / sửa / xóa.
// Học vấn không có evidence vì bảng CandidateEducation không có cột này.
const GROUPS = {
  skill: {
    dataKey: 'skills',
    title: 'Kỹ năng',
    itemName: 'kỹ năng',
    emptyText: 'Chưa có kỹ năng nào.',
    fields: [
      { name: 'rawName', label: 'Tên kỹ năng', required: true, maxLength: 255 },
      {
        name: 'evidence',
        label: 'Bằng chứng trong CV',
        type: 'textarea',
        hint: 'Câu trong CV cho thấy bạn có kỹ năng này',
      },
    ],
    toForm: (item) => ({ rawName: item.rawName || '', evidence: item.evidence || '' }),
    nameOf: (item) => item.rawName,
    create: createSkill,
    update: updateSkill,
    remove: deleteSkill,
  },
  experience: {
    dataKey: 'experiences',
    title: 'Kinh nghiệm',
    itemName: 'kinh nghiệm',
    emptyText: 'Chưa có kinh nghiệm nào.',
    fields: [
      { name: 'position', label: 'Vị trí công việc', required: true, maxLength: 255 },
      { name: 'companyName', label: 'Tên công ty', required: true, maxLength: 255 },
      { name: 'startDate', label: 'Bắt đầu', type: 'month', pair: 'start' },
      { name: 'endDate', label: 'Kết thúc', type: 'month', pair: 'end' },
      { name: 'description', label: 'Mô tả công việc', type: 'textarea' },
      { name: 'evidence', label: 'Bằng chứng trong CV', type: 'textarea' },
    ],
    toForm: (item) => ({
      position: item.position || '',
      companyName: item.companyName || '',
      startDate: toMonthInput(item.startDate),
      endDate: toMonthInput(item.endDate),
      description: item.description || '',
      evidence: item.evidence || '',
    }),
    nameOf: (item) => item.position || item.companyName,
    create: createExperience,
    update: updateExperience,
    remove: deleteExperience,
  },
  education: {
    dataKey: 'educations',
    title: 'Học vấn',
    itemName: 'học vấn',
    emptyText: 'Chưa có học vấn nào.',
    fields: [
      { name: 'school', label: 'Tên trường', required: true, maxLength: 255 },
      { name: 'major', label: 'Chuyên ngành', maxLength: 255 },
      { name: 'degree', label: 'Bằng cấp', maxLength: 255 },
      { name: 'startDate', label: 'Bắt đầu', type: 'month', pair: 'start' },
      { name: 'endDate', label: 'Kết thúc', type: 'month', pair: 'end' },
    ],
    toForm: (item) => ({
      school: item.school || '',
      major: item.major || '',
      degree: item.degree || '',
      startDate: toMonthInput(item.startDate),
      endDate: toMonthInput(item.endDate),
    }),
    nameOf: (item) => item.school,
    create: createEducation,
    update: updateEducation,
    remove: deleteEducation,
  },
}

const GROUP_ORDER = ['skill', 'experience', 'education']

const EMPTY_DATA = { skills: [], experiences: [], educations: [] }

function pickData(profile) {
  return {
    skills: profile.skills || [],
    experiences: profile.experiences || [],
    educations: profile.educations || [],
  }
}

// Form rỗng của một nhóm, dùng khi thêm thủ công
function emptyForm(config) {
  return Object.fromEntries(config.fields.map((field) => [field.name, '']))
}

// Dữ liệu hiện tại của dòng, gửi khi bấm "Xác nhận". Ngày gửi đủ YYYY-MM-DD thay vì dạng tháng của
// form sửa, để mốc NLP ghi theo ngày cụ thể (vd 15/03/2020) không bị đổi về ngày 1
function currentPayload(config, item) {
  const payload = config.toForm(item)
  for (const name of ['startDate', 'endDate']) {
    if (name in payload) {
      payload[name] = item[name] ? item[name].slice(0, 10) : ''
    }
  }
  return payload
}

function validate(config, form) {
  const errors = {}
  config.fields.forEach((field) => {
    if (field.required && !form[field.name].trim()) {
      errors[field.name] = `Vui lòng nhập ${field.label.toLowerCase()}`
    }
  })
  // "YYYY-MM" so sánh theo chuỗi là đúng thứ tự thời gian
  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    errors.endDate = 'Tháng kết thúc phải sau hoặc trùng tháng bắt đầu'
  }
  return errors
}

function formatPeriod(startDate, endDate) {
  const start = formatMonthYear(startDate)
  const end = formatMonthYear(endDate)
  if (start && end) return `${start} - ${end}`
  if (start) return `Từ ${start}`
  if (end) return `Đến ${end}`
  return ''
}

// Câu trích từ CV, hiện sẵn và thu gọn được (thẻ details của HTML, không cần JS)
function Evidence({ text }) {
  if (!text) return null
  return (
    <details className={styles.evidence} open>
      <summary className={styles.evidenceToggle}>Bằng chứng trong CV</summary>
      <blockquote className={styles.evidenceText}>{text}</blockquote>
    </details>
  )
}

// Nội dung đã trích xuất của một dòng, khác nhau theo nhóm
function ItemContent({ group, item }) {
  if (group === 'skill') {
    // Tên đã chuẩn hóa theo từ điển (vd "reactjs" -> "React"), chỉ hiện khi khác tên gốc trong CV
    const normalized = item.skill && item.skill.name.toLowerCase() !== item.rawName.toLowerCase() ? item.skill.name : ''
    return (
      <>
        <p className={styles.title}>{item.rawName}</p>
        {normalized && <p className={styles.meta}>Chuẩn hóa thành: {normalized}</p>}
        <Evidence text={item.evidence} />
      </>
    )
  }

  if (group === 'experience') {
    const period = formatPeriod(item.startDate, item.endDate)
    return (
      <>
        <p className={styles.title}>{item.position || 'Chưa có vị trí công việc'}</p>
        <p className={styles.meta}>{item.companyName || 'Chưa có tên công ty'}</p>
        {period && <p className={styles.meta}>{period}</p>}
        {item.description && <p className={styles.description}>{item.description}</p>}
        <Evidence text={item.evidence} />
      </>
    )
  }

  const studyInfo = [item.degree, item.major].filter(Boolean).join(', ')
  const period = formatPeriod(item.startDate, item.endDate)
  return (
    <>
      <p className={styles.title}>{item.school || 'Chưa có tên trường'}</p>
      {studyInfo && <p className={styles.meta}>{studyInfo}</p>}
      {period && <p className={styles.meta}>{period}</p>}
    </>
  )
}

function ParsedCV() {
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Thông báo sau thao tác, hiện trong đúng nhóm vừa thao tác: { group, type, text }
  const [notice, setNotice] = useState(null)

  // Modal thêm / sửa: { group, item } (item null = thêm thủ công)
  const [editor, setEditor] = useState(null)
  const [form, setForm] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Dòng đang gửi "Xác nhận": "skill-12", "experience-3"...
  const [confirmingKey, setConfirmingKey] = useState(null)

  // Modal xác nhận xóa: { group, item }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let ignore = false
    getMyProfile()
      .then((result) => {
        if (!ignore) setData(pickData(result.data))
      })
      .catch((err) => {
        if (!ignore) setLoadError(getErrorMessage(err, 'Không tải được kết quả phân tích CV'))
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

  // Tải lại sau mỗi thao tác để nhãn "Chưa xác nhận", nguồn và nội dung luôn đúng với database
  async function refresh(group) {
    try {
      const result = await getMyProfile()
      setData(pickData(result.data))
    } catch (err) {
      setNotice({ group, type: 'error', text: getErrorMessage(err, 'Không tải lại được dữ liệu, vui lòng tải lại trang') })
    }
  }

  // ===== Thêm / sửa =====

  function openEditor(group, item) {
    const config = GROUPS[group]
    setNotice(null)
    setForm(item ? config.toForm(item) : emptyForm(config))
    setFieldErrors({})
    setFormError('')
    setEditor({ group, item })
  }

  function closeEditor() {
    if (!saving) setEditor(null)
  }

  function handleFieldChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleSave(event) {
    event.preventDefault()
    const { group, item } = editor
    const config = GROUPS[group]
    setFormError('')

    const errors = validate(config, form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    // Gửi đủ mọi trường: ô để trống thì backend lưu rỗng / null
    const payload = Object.fromEntries(Object.entries(form).map(([name, value]) => [name, value.trim()]))

    setSaving(true)
    try {
      if (item) {
        // Sửa xong thì backend tự đánh dấu đã xác nhận
        await config.update(item.id, payload)
      } else {
        await config.create(payload)
      }
      setEditor(null)
      setNotice({ group, type: 'success', text: item ? 'Đã lưu thay đổi.' : `Đã thêm ${config.itemName}.` })
      await refresh(group)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Lưu thất bại, vui lòng thử lại'))
    } finally {
      setSaving(false)
    }
  }

  // ===== Xác nhận =====

  // Không có endpoint xác nhận riêng: gửi lại đúng dữ liệu hiện tại qua hàm update đã có,
  // backend coi mọi lần cập nhật là người dùng đã kiểm tra (isConfirmed = true)
  async function handleConfirm(group, item) {
    const config = GROUPS[group]
    setNotice(null)
    setConfirmingKey(`${group}-${item.id}`)
    try {
      await config.update(item.id, currentPayload(config, item))
      setNotice({ group, type: 'success', text: 'Đã xác nhận.' })
      await refresh(group)
    } catch (err) {
      // 400: dữ liệu phân tích ra còn thiếu trường bắt buộc (vd kinh nghiệm chưa có tên công ty)
      const hint = err.response && err.response.status === 400 ? ' Bấm "Sửa" để bổ sung.' : ''
      setNotice({ group, type: 'error', text: `Không xác nhận được: ${getErrorMessage(err)}.${hint}` })
    } finally {
      setConfirmingKey(null)
    }
  }

  // ===== Xóa =====

  function openDelete(group, item) {
    setNotice(null)
    setDeleteError('')
    setDeleteTarget({ group, item })
  }

  function closeDelete() {
    if (!deleting) setDeleteTarget(null)
  }

  async function handleDelete() {
    const { group, item } = deleteTarget
    const config = GROUPS[group]
    setDeleting(true)
    setDeleteError('')
    try {
      await config.remove(item.id)
      setDeleteTarget(null)
      setNotice({ group, type: 'success', text: `Đã xóa ${config.itemName}.` })
      await refresh(group)
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Xóa thất bại, vui lòng thử lại'))
    } finally {
      setDeleting(false)
    }
  }

  // ===== Hiển thị =====

  function renderField(field) {
    const common = {
      label: field.label,
      name: field.name,
      required: field.required,
      maxLength: field.maxLength,
      hint: field.hint,
      value: form[field.name] || '',
      onChange: handleFieldChange,
      error: fieldErrors[field.name],
      disabled: saving,
    }
    if (field.type === 'textarea') {
      return <Textarea key={field.name} {...common} rows={3} />
    }
    // Trình duyệt không hỗ trợ ô tháng sẽ hiện ô chữ, placeholder chỉ đúng định dạng backend nhận
    return (
      <Input
        key={field.name}
        {...common}
        type={field.type || 'text'}
        placeholder={field.type === 'month' ? 'YYYY-MM' : undefined}
      />
    )
  }

  function renderEditorFields(config) {
    const startField = config.fields.find((field) => field.pair === 'start')
    const endField = config.fields.find((field) => field.pair === 'end')
    const rows = []
    config.fields.forEach((field) => {
      if (field.pair === 'end') return
      if (field.pair === 'start') {
        // Cặp tháng bắt đầu / kết thúc đứng cạnh nhau trên màn hình rộng
        rows.push(
          <div key="period" className={styles.periodRow}>
            {renderField(startField)}
            {renderField(endField)}
          </div>,
        )
        return
      }
      rows.push(renderField(field))
    })
    return rows
  }

  function renderSection(group) {
    const config = GROUPS[group]
    const items = data[config.dataKey]
    const sectionNotice = notice && notice.group === group ? notice : null

    return (
      <section key={group} className={styles.section} aria-labelledby={`parsed-${group}`}>
        <div className={styles.sectionHeader}>
          <h2 id={`parsed-${group}`}>{config.title}</h2>
          <Button variant="secondary" size="sm" onClick={() => openEditor(group, null)}>
            Thêm thủ công
          </Button>
        </div>

        {sectionNotice && (
          <p
            className={sectionNotice.type === 'error' ? styles.alertError : styles.alertSuccess}
            role={sectionNotice.type === 'error' ? 'alert' : 'status'}
          >
            {sectionNotice.text}
          </p>
        )}

        {items.length === 0 ? (
          <p className={styles.empty}>{config.emptyText}</p>
        ) : (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <div className={styles.content}>
                  <ItemContent group={group} item={item} />
                </div>
                <div className={styles.side}>
                  <div className={styles.badges}>
                    <Badge status={item.source}>{item.source}</Badge>
                    {!item.isConfirmed && <Badge status={UNCONFIRMED_STATUS}>Chưa xác nhận</Badge>}
                  </div>
                  <div className={styles.actions}>
                    {!item.isConfirmed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfirm(group, item)}
                        loading={confirmingKey === `${group}-${item.id}`}
                        disabled={confirmingKey !== null}
                      >
                        {confirmingKey === `${group}-${item.id}` ? 'Đang xác nhận...' : 'Xác nhận'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditor(group, item)}
                      disabled={confirmingKey !== null}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDelete(group, item)}
                      disabled={confirmingKey !== null}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  if (loading) {
    return <Loading text="Đang tải kết quả phân tích..." />
  }

  if (loadError) {
    return (
      <>
        <h1>Kết quả phân tích CV</h1>
        <p className={styles.alertError} role="alert">
          {loadError}
        </p>
        <Button variant="secondary" onClick={handleRetry}>
          Thử lại
        </Button>
      </>
    )
  }

  const editorConfig = editor ? GROUPS[editor.group] : null
  const deleteConfig = deleteTarget ? GROUPS[deleteTarget.group] : null
  const deleteName = deleteTarget ? deleteConfig.nameOf(deleteTarget.item) : ''

  return (
    <>
      <h1>Kết quả phân tích CV</h1>
      <div className={styles.reminder} role="note">
        <p className={styles.reminderText}>
          Dữ liệu dưới đây do hệ thống tự phân tích từ CV của bạn, có thể chưa chính xác. Vui lòng kiểm tra và chỉnh
          sửa.
        </p>
        <p className={styles.reminderText}>
          Mục có nhãn "Chưa xác nhận": bấm "Xác nhận" nếu đúng, bấm "Sửa" nếu cần chỉnh. Khi phân tích lại CV, các mục
          chưa xác nhận có thể được thay mới, mục đã xác nhận được giữ nguyên.
        </p>
      </div>
      <p className={styles.legend}>
        Nguồn: RULE là đối chiếu từ điển kỹ năng, NLP là mô hình ngôn ngữ phân tích, MANUAL là bạn tự nhập.
      </p>

      {GROUP_ORDER.map(renderSection)}

      <Modal
        open={editor !== null}
        onClose={closeEditor}
        title={editor ? `${editor.item ? 'Sửa' : 'Thêm'} ${editorConfig.itemName}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={closeEditor} disabled={saving}>
              Hủy
            </Button>
            {/* Nút nằm ở chân Modal, ngoài thẻ form, nên gắn vào form bằng thuộc tính form */}
            <Button type="submit" form={FORM_ID} loading={saving}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </>
        }
      >
        {editor && (
          <form id={FORM_ID} className={styles.form} onSubmit={handleSave} noValidate>
            {formError && (
              <p className={styles.alertError} role="alert">
                {formError}
              </p>
            )}
            {renderEditorFields(editorConfig)}
          </form>
        )}
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={closeDelete}
        title={deleteConfig ? `Xóa ${deleteConfig.itemName}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={closeDelete} disabled={deleting}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </>
        }
      >
        <p className={styles.modalText}>
          Xóa {deleteConfig ? deleteConfig.itemName : ''}
          {deleteName ? ` "${deleteName}"` : ''} khỏi hồ sơ? Thao tác này không hoàn tác được.
        </p>
        {deleteError && (
          <p className={styles.alertError} role="alert">
            {deleteError}
          </p>
        )}
      </Modal>
    </>
  )
}

export default ParsedCV
