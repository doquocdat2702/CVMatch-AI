import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createRequirement,
  deleteRequirement,
  getJobDetail,
  getRequirements,
  parseJD,
  updateRequirement,
} from '../../api/job.api'
import { getMyRecruiterProfile } from '../../api/recruiter.api'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import Select from '../../components/common/Select'
import Table from '../../components/common/Table'
import Textarea from '../../components/common/Textarea'
import { getErrorMessage } from '../../utils/apiError'
import { REQUIREMENT_TYPE_LABEL } from '../../utils/labels'
import styles from './ParsedJD.module.css'

const TYPE_OPTIONS = ['REQUIRED', 'PREFERRED', 'OPTIONAL'].map((type) => ({
  value: type,
  label: REQUIREMENT_TYPE_LABEL[type],
}))

// Khớp kiểm tra của backend (job.requirement.service.js)
const MAX_MIN_YEARS = 50
const EMPTY_ADD_FORM = { rawText: '', normalizedName: '', type: 'REQUIRED', minYears: '' }
const ADD_FORM_ID = 'add-requirement-form'

function validateAddForm(form) {
  const errors = {}
  if (!form.rawText.trim()) errors.rawText = 'Vui lòng nhập câu yêu cầu'
  if (!form.normalizedName.trim()) errors.normalizedName = 'Vui lòng nhập tên yêu cầu'
  if (form.minYears !== '') {
    const years = Number(form.minYears)
    if (!Number.isInteger(years) || years < 0 || years > MAX_MIN_YEARS) {
      errors.minYears = `Số năm phải là số nguyên từ 0 đến ${MAX_MIN_YEARS}`
    }
  }
  return errors
}

// Xem và chỉnh yêu cầu đã tách từ JD của một tin (chỉ người đăng tin được sửa).
// jobId do AppRouter truyền, kèm key theo jobId để mỗi tin là một lần mount mới.
function ParsedJD({ jobId }) {
  const [job, setJob] = useState(null)
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [forbidden, setForbidden] = useState(false)

  // Thông báo sau mỗi thao tác: { type: 'success' | 'warning' | 'error', text }
  const [notices, setNotices] = useState([])
  // Dòng đang lưu loại yêu cầu
  const [savingTypeId, setSavingTypeId] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM)
  const [addErrors, setAddErrors] = useState({})
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const [reparseOpen, setReparseOpen] = useState(false)
  const [parsing, setParsing] = useState(false)

  useEffect(() => {
    let ignore = false
    Promise.all([getJobDetail(jobId), getMyRecruiterProfile(), getRequirements(jobId)])
      .then(([jobResult, profileResult, requirementsResult]) => {
        if (ignore) return
        // HR xem chung, sửa riêng: tin của đồng nghiệp không mở trang chỉnh sửa (backend cũng chặn)
        if (jobResult.data.recruiterProfileId !== profileResult.data.id) {
          setForbidden(true)
          return
        }
        setJob(jobResult.data)
        setRequirements(requirementsResult.data)
      })
      .catch((err) => {
        if (!ignore) setLoadError(getErrorMessage(err, 'Không tải được yêu cầu của tin tuyển dụng'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [jobId])

  // ===== Đổi loại: lưu ngay khi chọn =====

  async function handleTypeChange(requirement, type) {
    if (type === requirement.type) return
    setNotices([])
    setSavingTypeId(requirement.id)
    try {
      const result = await updateRequirement(jobId, requirement.id, { type })
      setRequirements((prev) => prev.map((item) => (item.id === requirement.id ? result.data : item)))
      setNotices([
        { type: 'success', text: `Đã đổi "${result.data.normalizedName}" thành ${REQUIREMENT_TYPE_LABEL[type]}.` },
      ])
    } catch (err) {
      // Dropdown đọc giá trị từ state nên tự trở về loại cũ khi lưu lỗi
      setNotices([{ type: 'error', text: getErrorMessage(err, 'Đổi loại yêu cầu thất bại, vui lòng thử lại') }])
    } finally {
      setSavingTypeId(null)
    }
  }

  // ===== Xóa =====

  function openDelete(requirement) {
    setNotices([])
    setDeleteError('')
    setDeleteTarget(requirement)
  }

  function closeDelete() {
    if (!deleting) setDeleteTarget(null)
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteRequirement(jobId, deleteTarget.id)
      setRequirements((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      setNotices([{ type: 'success', text: `Đã xóa yêu cầu "${deleteTarget.normalizedName}".` }])
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Xóa yêu cầu thất bại, vui lòng thử lại'))
    } finally {
      setDeleting(false)
    }
  }

  // ===== Thêm thủ công =====

  function openAdd() {
    setNotices([])
    setAddForm(EMPTY_ADD_FORM)
    setAddErrors({})
    setAddError('')
    setAddOpen(true)
  }

  function closeAdd() {
    if (!adding) setAddOpen(false)
  }

  function handleAddChange(event) {
    const { name, value } = event.target
    setAddForm((prev) => ({ ...prev, [name]: value }))
    setAddErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleAdd(event) {
    event.preventDefault()
    setAddError('')
    const errors = validateAddForm(addForm)
    setAddErrors(errors)
    if (Object.keys(errors).length > 0) return

    setAdding(true)
    try {
      const result = await createRequirement(jobId, {
        rawText: addForm.rawText.trim(),
        normalizedName: addForm.normalizedName.trim(),
        type: addForm.type,
        minYears: addForm.minYears === '' ? null : Number(addForm.minYears),
      })
      setRequirements((prev) => [...prev, result.data])
      setNotices([{ type: 'success', text: `Đã thêm yêu cầu "${result.data.normalizedName}".` }])
      setAddOpen(false)
    } catch (err) {
      setAddError(getErrorMessage(err, 'Thêm yêu cầu thất bại, vui lòng thử lại'))
    } finally {
      setAdding(false)
    }
  }

  // ===== Phân tích lại JD (ghi đè toàn bộ) =====

  async function handleReparse() {
    setReparseOpen(false)
    setNotices([])
    setParsing(true)
    try {
      const result = await parseJD(jobId)
      const { requirements: list, mode, unresolvedCount } = result.data
      setRequirements(list)
      const next = [
        list.length > 0
          ? { type: 'success', text: `Đã phân tích JD: ${list.length} yêu cầu.` }
          : {
              type: 'warning',
              text: 'Không tách được yêu cầu nào. Hãy kiểm tra JD có mục "YÊU CẦU CÔNG VIỆC" và mỗi yêu cầu một dòng.',
            },
      ]
      // Chế độ rule: yêu cầu không có từ khóa bắt buộc / ưu tiên thì tạm để Ưu tiên
      if (mode === 'rule' && unresolvedCount > 0) {
        next.push({
          type: 'warning',
          text: `${unresolvedCount} yêu cầu chưa phân loại chắc chắn, đang để Ưu tiên, vui lòng kiểm tra lại`,
        })
      }
      setNotices(next)
    } catch (err) {
      setNotices([{ type: 'error', text: getErrorMessage(err, 'Phân tích JD thất bại, vui lòng thử lại') }])
    } finally {
      setParsing(false)
    }
  }

  const columns = [
    {
      key: 'rawText',
      title: 'Câu gốc trong JD',
      render: (requirement) => <span className={styles.rawText}>{requirement.rawText}</span>,
    },
    {
      key: 'normalizedName',
      title: 'Tên đã chuẩn hóa',
      render: (requirement) => (
        <div className={styles.nameCell}>
          <span className={styles.name}>{requirement.normalizedName}</span>
          {requirement.minYears ? <span className={styles.muted}>Tối thiểu {requirement.minYears} năm</span> : null}
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Loại',
      render: (requirement) => (
        <Select
          aria-label={`Loại của yêu cầu ${requirement.normalizedName}`}
          options={TYPE_OPTIONS}
          value={requirement.type}
          onChange={(event) => handleTypeChange(requirement, event.target.value)}
          disabled={savingTypeId !== null || parsing}
          className={styles.typeSelect}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      render: (requirement) => (
        <Button variant="ghost" size="sm" onClick={() => openDelete(requirement)} disabled={parsing}>
          Xóa
        </Button>
      ),
    },
  ]

  const backLink = (
    <Link className={styles.backLink} to={`/recruiter/jobs/${jobId}/edit`}>
      Quay lại tin tuyển dụng
    </Link>
  )

  if (loading) {
    return <Loading text="Đang tải yêu cầu..." />
  }

  if (loadError || forbidden) {
    return (
      <>
        {backLink}
        <h1>Yêu cầu tuyển dụng</h1>
        <p className={styles.alertError} role="alert">
          {forbidden ? 'Bạn chỉ được chỉnh sửa tin tuyển dụng do mình đăng.' : loadError}
        </p>
      </>
    )
  }

  return (
    <>
      {backLink}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Yêu cầu tuyển dụng</h1>
          <p className={styles.jobTitle}>{job.title}</p>
        </div>
        <div className={styles.headerActions}>
          {/* Chưa có yêu cầu thì không có gì bị ghi đè: phân tích luôn, không hỏi */}
          <Button
            variant="secondary"
            onClick={requirements.length > 0 ? () => setReparseOpen(true) : handleReparse}
            loading={parsing}
          >
            {parsing ? 'Đang phân tích...' : requirements.length > 0 ? 'Phân tích lại JD' : 'Phân tích JD'}
          </Button>
          <Button onClick={openAdd} disabled={parsing}>
            Thêm yêu cầu thủ công
          </Button>
        </div>
      </div>
      <p className={styles.intro}>
        Các yêu cầu này dùng để đối chiếu với hồ sơ ứng viên. Đổi loại ở cột Loại được lưu ngay.
      </p>

      {notices.map((notice) => (
        <p
          key={notice.text}
          className={styles[`alert${notice.type[0].toUpperCase()}${notice.type.slice(1)}`]}
          role={notice.type === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      ))}

      {parsing ? (
        <Loading text="Đang phân tích JD..." />
      ) : (
        <Table
          columns={columns}
          data={requirements}
          emptyText="Chưa có yêu cầu nào. Phân tích JD hoặc thêm yêu cầu thủ công."
        />
      )}

      {/* Phân tích lại: cảnh báo ghi đè chỉnh sửa tay */}
      <Modal
        open={reparseOpen}
        onClose={() => setReparseOpen(false)}
        title="Phân tích lại JD?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReparseOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleReparse}>
              Phân tích lại
            </Button>
          </>
        }
      >
        <p className={styles.modalText}>
          Phân tích lại sẽ xóa toàn bộ {requirements.length} yêu cầu hiện tại, kể cả các chỉnh sửa tay (đổi loại, thêm,
          xóa), rồi tách lại từ JD đã lưu. Thao tác này không hoàn tác được.
        </p>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={closeDelete}
        title="Xóa yêu cầu"
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
          Xóa yêu cầu "{deleteTarget ? deleteTarget.normalizedName : ''}"? Ứng viên sẽ không còn được đối chiếu theo
          yêu cầu này.
        </p>
        {deleteError && (
          <p className={styles.alertError} role="alert">
            {deleteError}
          </p>
        )}
      </Modal>

      <Modal
        open={addOpen}
        onClose={closeAdd}
        title="Thêm yêu cầu thủ công"
        footer={
          <>
            <Button variant="secondary" onClick={closeAdd} disabled={adding}>
              Hủy
            </Button>
            {/* Nút ở chân Modal, ngoài thẻ form: gắn vào form bằng thuộc tính form */}
            <Button type="submit" form={ADD_FORM_ID} loading={adding}>
              {adding ? 'Đang thêm...' : 'Thêm'}
            </Button>
          </>
        }
      >
        <form id={ADD_FORM_ID} className={styles.form} onSubmit={handleAdd} noValidate>
          {addError && (
            <p className={styles.alertError} role="alert">
              {addError}
            </p>
          )}
          <Textarea
            label="Câu yêu cầu gốc"
            name="rawText"
            required
            rows={3}
            hint="Câu trong JD hoặc câu bạn tự viết, dùng làm dẫn chứng cho yêu cầu"
            value={addForm.rawText}
            onChange={handleAddChange}
            error={addErrors.rawText}
            disabled={adding}
          />
          <Input
            label="Tên yêu cầu"
            name="normalizedName"
            required
            maxLength={255}
            hint="Tên ngắn để đối chiếu, ví dụ: Excel, Kế toán tổng hợp"
            value={addForm.normalizedName}
            onChange={handleAddChange}
            error={addErrors.normalizedName}
            disabled={adding}
          />
          <Select
            label="Loại"
            name="type"
            options={TYPE_OPTIONS}
            value={addForm.type}
            onChange={handleAddChange}
            disabled={adding}
          />
          <Input
            label="Số năm kinh nghiệm tối thiểu"
            name="minYears"
            type="number"
            min={0}
            max={MAX_MIN_YEARS}
            hint="Bỏ trống nếu không yêu cầu số năm"
            value={addForm.minYears}
            onChange={handleAddChange}
            error={addErrors.minYears}
            disabled={adding}
          />
        </form>
      </Modal>
    </>
  )
}

export default ParsedJD
