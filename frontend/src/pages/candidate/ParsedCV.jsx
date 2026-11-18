import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
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
import CVExportModal from '../../components/cv-export/CVExportModal'
import { getErrorMessage } from '../../utils/apiError'
import { formatMonthYear, toMonthInput } from '../../utils/format'
import { PROFILE_SOURCE_LABEL } from '../../utils/labels'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import styles from './ParsedCV.module.css'

// Mục chưa xác nhận dùng màu vàng của Badge (nhóm "chưa chắc chắn"), đã xác nhận màu xanh lá
const UNCONFIRMED_STATUS = 'UNCERTAIN'
const CONFIRMED_STATUS = 'COMPLETED'

// Khung giải thích cách phân tích (T35g) mở sẵn ở lần đầu vào trang; đã xem thì các lần sau thu gọn.
// Chỉ là tiện ích hiển thị cho từng trình duyệt: localStorage lỗi (chế độ ẩn danh...) thì coi như lần đầu
const GUIDE_SEEN_KEY = 'cvmatch.parsedCvGuideSeen'

function readGuideSeen() {
  try {
    return window.localStorage.getItem(GUIDE_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markGuideSeen() {
  try {
    window.localStorage.setItem(GUIDE_SEEN_KEY, '1')
  } catch {
    // Không lưu được thì lần sau khung vẫn mở sẵn
  }
}

const MODE_TEXT = {
  rule: 'chỉ dùng từ điển kỹ năng, chưa đọc kinh nghiệm và học vấn',
  hybrid: 'dùng từ điển kỹ năng kết hợp AI',
}

// Chế độ suy ra từ nguồn của các mục đang có (khi không vừa phân tích xong): có mục do AI đọc là đã dùng Hybrid
function inferMode(data) {
  const items = [...data.skills, ...data.experiences, ...data.educations]
  if (items.some((item) => item.source === 'NLP')) return 'hybrid'
  if (items.some((item) => item.source === 'RULE')) return 'rule'
  return null
}

// "Hệ thống phân tích CV của bạn như thế nào": 4 bước theo đúng luồng của backend
// (text-extraction -> rule.parser + nlp.parser -> normalizer -> người dùng xác nhận), chế độ đã dùng.
// T35j: bỏ câu nhắc "không dùng để đánh giá năng lực" (CLAUDE.md mục 5)
//   mode: chế độ của lần phân tích vừa rồi (trang CV của tôi chuyển sang), null thì suy ra từ dữ liệu
function AnalysisGuide({ mode, data }) {
  // Mở sẵn ở lần đầu; đọc localStorage đúng một lần khi vào trang
  const [initialOpen] = useState(() => !readGuideSeen())
  useEffect(() => {
    markGuideSeen()
  }, [])

  const inferred = mode ? null : inferMode(data)
  let modeLine
  if (mode && MODE_TEXT[mode]) {
    modeLine = `Lần phân tích vừa rồi ${MODE_TEXT[mode]}.`
  } else if (inferred === 'hybrid') {
    modeLine = 'Hồ sơ có mục do AI đọc từ CV.'
  } else if (inferred === 'rule') {
    modeLine = 'Hồ sơ hiện chỉ có mục đọc bằng từ điển kỹ năng.'
  } else {
    modeLine = 'Hồ sơ chưa có mục nào do hệ thống đọc từ CV.'
  }

  return (
    <details className={styles.guide} open={initialOpen}>
      <summary className={styles.guideSummary}>Cách hệ thống đọc CV của bạn</summary>
      <div className={styles.guideBody}>
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepTitle}>Lấy chữ từ file.</span> Đọc chữ trong file PDF hoặc Word bạn tải lên.
          </li>
          <li>
            <span className={styles.stepTitle}>Nhận diện kỹ năng.</span> So chữ trong CV với từ điển kỹ năng. Khi bật
            AI, hệ thống đọc thêm kinh nghiệm và học vấn.
          </li>
          <li>
            <span className={styles.stepTitle}>Chuẩn hóa.</span> Đưa tên kỹ năng về tên chuẩn, ví dụ "MS Excel" thành
            "Excel", và mốc thời gian về tháng/năm.
          </li>
          <li>
            <span className={styles.stepTitle}>Bạn kiểm tra và xác nhận.</span> Mục đã xác nhận được giữ nguyên khi phân
            tích lại CV, mục chưa xác nhận có thể được thay mới.
          </li>
        </ol>
        <p className={styles.guideMode}>{modeLine}</p>
      </div>
    </details>
  )
}

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
      errors[field.name] = `Vui lòng nhập ${field.label.toLowerCase()}.`
    }
  })
  // "YYYY-MM" so sánh theo chuỗi là đúng thứ tự thời gian
  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    errors.endDate = 'Tháng kết thúc không được trước tháng bắt đầu.'
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

// So nguyên văn bỏ khác biệt hoa thường / khoảng trắng
function sameText(a, b) {
  const clean = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi')
  return clean(a) === clean(b)
}

// Câu trích từ CV, thu gọn sẵn (T35j), chỉ hiện khi bấm (thẻ details của HTML, không cần JS).
// Trùng nguyên văn tên mục (vd kỹ năng "Excel" có bằng chứng "Excel") thì ẩn hẳn: không thêm thông tin gì
function Evidence({ text, name }) {
  if (!text || sameText(text, name)) return null
  return (
    <details className={styles.evidence}>
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
        <Evidence text={item.evidence} name={item.rawName} />
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
        <Evidence text={item.evidence} name={item.position} />
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
  useDocumentTitle('Kết quả phân tích CV')
  // Trang CV của tôi chuyển sang kèm chế độ của lần phân tích vừa rồi ({ mode: 'rule' | 'hybrid' }, T35g)
  const location = useLocation()
  const modeFromAnalysis = location.state && location.state.mode ? location.state.mode : null
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

  // Modal xuất CV (T29b)
  const [exportOpen, setExportOpen] = useState(false)

  // Dòng đang gửi "Xác nhận": "skill-12", "experience-3"...
  const [confirmingKey, setConfirmingKey] = useState(null)

  // "Xác nhận tất cả" kỹ năng (T35j): hộp xác nhận mở / đang chạy
  const [confirmAllOpen, setConfirmAllOpen] = useState(false)
  const [confirmingAll, setConfirmingAll] = useState(false)

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
        if (!ignore) setLoadError(getErrorMessage(err, 'Không tải được kết quả phân tích CV.'))
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
      setNotice({ group, type: 'error', text: getErrorMessage(err, 'Không tải lại được dữ liệu. Vui lòng tải lại trang.') })
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
      setFormError(getErrorMessage(err, 'Chưa lưu được. Vui lòng thử lại.'))
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
      setNotice({ group, type: 'error', text: `Không xác nhận được. ${getErrorMessage(err)}${hint}` })
    } finally {
      setConfirmingKey(null)
    }
  }

  // Xác nhận mọi kỹ năng chưa xác nhận: không có API hàng loạt nên gọi lần lượt hàm update đã có (như nút
  // "Xác nhận" từng dòng), tuần tự để không dồn request; lỗi ở một mục không dừng các mục sau. Báo số đã xác nhận
  async function handleConfirmAll() {
    const config = GROUPS.skill
    const targets = data.skills.filter((item) => !item.isConfirmed)
    setConfirmingAll(true)
    let done = 0
    for (const item of targets) {
      try {
        await config.update(item.id, currentPayload(config, item))
        done += 1
      } catch {
        // Bỏ qua mục lỗi, báo tổng ở cuối
      }
    }
    setConfirmingAll(false)
    setConfirmAllOpen(false)
    const failed = targets.length - done
    setNotice({
      group: 'skill',
      type: failed > 0 ? 'error' : 'success',
      text:
        failed > 0
          ? `Đã xác nhận ${done}/${targets.length} kỹ năng. ${failed} kỹ năng chưa xác nhận được, bấm "Sửa" để kiểm tra.`
          : `Đã xác nhận ${done} kỹ năng.`,
    })
    await refresh('skill')
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
      setDeleteError(getErrorMessage(err, 'Chưa xóa được. Vui lòng thử lại.'))
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

  // Kỹ năng chưa xác nhận: nhóm đứng đầu bảng và danh sách của "Xác nhận tất cả"
  const unconfirmedSkills = data.skills.filter((item) => !item.isConfirmed)

  // Nút Xác nhận / Sửa / Xóa của một mục (dùng chung cho bảng kỹ năng và danh sách kinh nghiệm, học vấn)
  function renderActions(group, item) {
    const busy = confirmingKey !== null || confirmingAll
    return (
      <div className={styles.actions}>
        {!item.isConfirmed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleConfirm(group, item)}
            loading={confirmingKey === `${group}-${item.id}`}
            disabled={busy}
          >
            {confirmingKey === `${group}-${item.id}` ? 'Đang xác nhận...' : 'Xác nhận'}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => openEditor(group, item)} disabled={busy}>
          Sửa
        </Button>
        <Button variant="ghost" size="sm" onClick={() => openDelete(group, item)} disabled={busy}>
          Xóa
        </Button>
      </div>
    )
  }

  // Bảng kỹ năng gọn (T35j): Kỹ năng | Nguồn | Trạng thái | Thao tác, mỗi kỹ năng một dòng thấp.
  // Nhóm "Chưa xác nhận (n)" đứng trước "Đã xác nhận (n)". Dưới 900px mỗi dòng thành một thẻ xếp dọc (CSS)
  function renderSkillTable(items, title) {
    if (items.length === 0) return null
    return (
      <div className={styles.skillGroup}>
        <h3 className={styles.skillGroupTitle}>
          {title} ({items.length})
        </h3>
        <div className={styles.skillTableWrap}>
          <table className={styles.skillTable}>
            <thead>
              <tr>
                <th scope="col">Kỹ năng</th>
                <th scope="col">Nguồn</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" className={styles.alignRight}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className={styles.skillCell}>
                    <ItemContent group="skill" item={item} />
                  </td>
                  <td data-label="Nguồn">
                    <Badge status={item.source}>{PROFILE_SOURCE_LABEL[item.source] || item.source}</Badge>
                  </td>
                  <td data-label="Trạng thái">
                    {item.isConfirmed ? (
                      <Badge status={CONFIRMED_STATUS}>Đã xác nhận</Badge>
                    ) : (
                      <Badge status={UNCONFIRMED_STATUS}>Chưa xác nhận</Badge>
                    )}
                  </td>
                  <td className={styles.alignRight}>{renderActions('skill', item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderSection(group) {
    const config = GROUPS[group]
    const items = data[config.dataKey]
    const sectionNotice = notice && notice.group === group ? notice : null

    return (
      <section key={group} className={styles.section} aria-labelledby={`parsed-${group}`}>
        <div className={styles.sectionHeader}>
          <h2 id={`parsed-${group}`}>{config.title}</h2>
          <div className={styles.sectionActions}>
            {group === 'skill' && unconfirmedSkills.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmAllOpen(true)}
                disabled={confirmingKey !== null || confirmingAll}
              >
                Xác nhận tất cả
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => openEditor(group, null)}>
              Thêm thủ công
            </Button>
          </div>
        </div>

        {sectionNotice && (
          <p
            className={sectionNotice.type === 'error' ? styles.alertError : styles.alertSuccess}
            role={sectionNotice.type === 'error' ? 'alert' : 'status'}
          >
            {sectionNotice.text}
          </p>
        )}

        {items.length === 0 && <p className={styles.empty}>{config.emptyText}</p>}
        {items.length > 0 && group === 'skill' && (
          <>
            {renderSkillTable(unconfirmedSkills, 'Chưa xác nhận')}
            {renderSkillTable(
              items.filter((item) => item.isConfirmed),
              'Đã xác nhận'
            )}
          </>
        )}
        {items.length > 0 && group !== 'skill' && (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <div className={styles.content}>
                  <ItemContent group={group} item={item} />
                </div>
                <div className={styles.side}>
                  <div className={styles.badges}>
                    {/* Nguồn bằng chữ tiếng Việt (T35g): Từ điển / AI / Tự nhập */}
                    <Badge status={item.source}>{PROFILE_SOURCE_LABEL[item.source] || item.source}</Badge>
                    {item.isConfirmed ? (
                      <Badge status={CONFIRMED_STATUS}>Đã xác nhận</Badge>
                    ) : (
                      <Badge status={UNCONFIRMED_STATUS}>Chưa xác nhận</Badge>
                    )}
                  </div>
                  {renderActions(group, item)}
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
      <div className={styles.pageHeader}>
        <h1>Kết quả phân tích CV</h1>
        <Button variant="secondary" onClick={() => setExportOpen(true)}>
          Xuất CV
        </Button>
      </div>
      <AnalysisGuide mode={modeFromAnalysis} data={data} />
      {/* Câu phụ duy nhất của trang (T35j, D3): dữ liệu đọc tự động nên cần kiểm tra trước khi xác nhận */}
      <p className={styles.reminder} role="note">
        Dữ liệu được đọc tự động từ CV. Kiểm tra từng mục rồi bấm "Xác nhận" hoặc "Sửa".
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
        open={confirmAllOpen}
        onClose={() => {
          if (!confirmingAll) setConfirmAllOpen(false)
        }}
        title="Xác nhận tất cả kỹ năng"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmAllOpen(false)} disabled={confirmingAll}>
              Hủy
            </Button>
            <Button onClick={handleConfirmAll} loading={confirmingAll}>
              {confirmingAll ? 'Đang xác nhận...' : 'Xác nhận'}
            </Button>
          </>
        }
      >
        <p className={styles.modalText}>
          Xác nhận {unconfirmedSkills.length} kỹ năng chưa xác nhận? Mục đã xác nhận được giữ nguyên khi phân tích lại CV.
        </p>
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

      {exportOpen && <CVExportModal onClose={() => setExportOpen(false)} />}
    </>
  )
}

export default ParsedCV
