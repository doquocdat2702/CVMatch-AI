import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createJob, getJobDetail, parseJD, updateJob } from '../../api/job.api'
import { getMyRecruiterProfile } from '../../api/recruiter.api'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import Table from '../../components/common/Table'
import Textarea from '../../components/common/Textarea'
import { getErrorMessage } from '../../utils/apiError'
import { REQUIREMENT_TYPE_LABEL } from '../../utils/labels'
import styles from './JobForm.module.css'

const EMPTY_FORM = { title: '', location: '', description: '' }

// JD mẫu theo đúng cách bộ phân tích đọc JD (requirement.extractor.js, requirement.classifier.js)
const JD_EXAMPLE = [
  'Mô tả công việc',
  '- Lập báo cáo tài chính định kỳ',
  'Yêu cầu công việc',
  '- Tối thiểu 2 năm kinh nghiệm kế toán tổng hợp',
  '- Thành thạo Excel, MISA',
  '- Ưu tiên ứng viên có chứng chỉ CPA',
  'Quyền lợi',
  '- Thưởng tháng 13, bảo hiểm đầy đủ',
].join('\n')

const REQUIREMENT_COLUMNS = [
  {
    key: 'normalizedName',
    title: 'Yêu cầu',
    render: (requirement) => (
      <div className={styles.requirementCell}>
        <span className={styles.requirementName}>{requirement.normalizedName}</span>
        <span className={styles.muted}>Câu gốc: {requirement.rawText}</span>
      </div>
    ),
  },
  {
    key: 'type',
    title: 'Loại',
    render: (requirement) => (
      <Badge status={requirement.type}>{REQUIREMENT_TYPE_LABEL[requirement.type] || requirement.type}</Badge>
    ),
  },
  {
    key: 'minYears',
    title: 'Số năm tối thiểu',
    align: 'right',
    render: (requirement) =>
      requirement.minYears ? `${requirement.minYears} năm` : <span className={styles.muted}>Không yêu cầu</span>,
  },
]

// Form tạo / sửa tin. jobId: không có = tạo mới; có = sửa (AppRouter gắn key theo jobId
// để mỗi tin là một lần mount mới, không lẫn state của tin trước)
function JobForm({ jobId }) {
  const isEdit = Boolean(jobId)
  const navigate = useNavigate()
  const location = useLocation()
  // Vừa tạo tin xong (trang tạo chuyển sang đây kèm state.created): báo đã tạo và hỏi phân tích JD
  const justCreated = Boolean(location.state && location.state.created)

  // Chế độ sửa: tải tin, kiểm tra quyền sửa
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [savedJob, setSavedJob] = useState(null)
  const [requirements, setRequirements] = useState([])

  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState(justCreated ? 'Đã tạo tin tuyển dụng.' : '')

  // Hộp thoại "Phân tích JD ngay?": 'created' (vừa tạo) | 'changed' (vừa sửa JD) | null
  const [askParse, setAskParse] = useState(justCreated ? 'created' : null)
  // JD đã đổi sau lần phân tích gần nhất: nhắc cho tới khi phân tích lại
  const [needsReparse, setNeedsReparse] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [parseResult, setParseResult] = useState(null) // { count, mode, unresolvedCount }

  // Xóa state.created khỏi lịch sử để tải lại trang không hỏi lại
  useEffect(() => {
    if (location.state && location.state.created) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    if (!isEdit) return undefined
    let ignore = false
    Promise.all([getJobDetail(jobId), getMyRecruiterProfile()])
      .then(([jobResult, profileResult]) => {
        if (ignore) return
        const job = jobResult.data
        // HR xem chung, sửa riêng: tin của đồng nghiệp không mở form (backend cũng chặn khi lưu)
        if (job.recruiterProfileId !== profileResult.data.id) {
          setForbidden(true)
          return
        }
        setSavedJob(job)
        setForm({ title: job.title, location: job.location || '', description: job.description })
        setRequirements(job.requirements || [])
      })
      .catch((err) => {
        if (!ignore) setLoadError(getErrorMessage(err, 'Không tải được tin tuyển dụng.'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [isEdit, jobId])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaveError('')
    setNotice('')

    const payload = {
      title: form.title.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
    }
    const errors = {}
    if (!payload.title) errors.title = 'Vui lòng nhập tiêu đề tin tuyển dụng.'
    if (!payload.description) errors.description = 'Vui lòng nhập mô tả công việc.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      if (!isEdit) {
        const result = await createJob(payload)
        // Sang trang sửa của tin vừa tạo: bấm Lưu lần nữa là cập nhật, không tạo tin trùng
        navigate(`/recruiter/jobs/${result.data.id}/edit`, { replace: true, state: { created: true } })
        return
      }
      const result = await updateJob(jobId, payload)
      setSavedJob((prev) => ({ ...prev, ...result.data }))
      setNotice('Đã lưu thay đổi.')
      // JD đổi thì yêu cầu cũ không còn khớp: bỏ kết quả phân tích cũ và hỏi phân tích lại
      if (result.data.requireReparse) {
        setNeedsReparse(true)
        setParseResult(null)
        setAskParse('changed')
      }
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Chưa lưu được tin tuyển dụng. Vui lòng thử lại.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleParse() {
    setAskParse(null)
    setParseError('')
    setParseResult(null)
    setParsing(true)
    try {
      // Phân tích JD đã lưu, ghi đè toàn bộ yêu cầu cũ
      const result = await parseJD(jobId)
      const { requirements: list, mode, unresolvedCount } = result.data
      setRequirements(list)
      setNeedsReparse(false)
      setParseResult({ count: list.length, mode, unresolvedCount })
    } catch (err) {
      setParseError(getErrorMessage(err, 'Chưa phân tích được yêu cầu. Vui lòng thử lại.'))
    } finally {
      setParsing(false)
    }
  }

  const backLink = (
    <Link className={styles.backLink} to="/recruiter/jobs">
      Quay lại danh sách tin
    </Link>
  )
  const pageTitle = isEdit ? 'Sửa tin tuyển dụng' : 'Tạo tin tuyển dụng'

  if (loading) {
    return <Loading text="Đang tải tin tuyển dụng..." />
  }

  if (loadError || forbidden) {
    return (
      <>
        {backLink}
        <h1>{pageTitle}</h1>
        <p className={styles.alertError} role="alert">
          {forbidden ? 'Chỉ người đăng tin mới sửa được tin tuyển dụng này.' : loadError}
        </p>
      </>
    )
  }

  // Ô JD đang khác JD đã lưu: phải lưu trước rồi mới phân tích (backend phân tích JD đã lưu)
  const jdDirty = isEdit && savedJob && form.description.trim() !== savedJob.description

  return (
    <>
      {backLink}
      <div className={styles.titleRow}>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
        {savedJob && !savedJob.isOpen && <Badge status="CLOSED">Đã đóng</Badge>}
      </div>

      {notice && (
        <p className={styles.alertSuccess} role="status">
          {notice}
        </p>
      )}

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {saveError && (
            <p className={styles.alertError} role="alert">
              {saveError}
            </p>
          )}
          <Input
            label="Tiêu đề tin"
            name="title"
            required
            maxLength={255}
            value={form.title}
            onChange={handleChange}
            error={fieldErrors.title}
            disabled={saving}
          />
          <Input
            label="Địa điểm làm việc"
            name="location"
            maxLength={255}
            hint="Ví dụ: Hà Nội"
            value={form.location}
            onChange={handleChange}
            disabled={saving}
          />
          <Textarea
            label="Mô tả công việc"
            name="description"
            required
            rows={18}
            hint="Viết theo gợi ý bên cạnh để tách yêu cầu chính xác hơn."
            value={form.description}
            onChange={handleChange}
            error={fieldErrors.description}
            disabled={saving}
          />
          <div className={styles.actions}>
            <Button type="submit" loading={saving}>
              {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo tin'}
            </Button>
            <Link className={styles.secondaryLink} to="/recruiter/jobs">
              Hủy
            </Link>
          </div>
        </form>

        <aside className={styles.tips} aria-labelledby="jd-tips-title">
          <h2 id="jd-tips-title" className={styles.tipsTitle}>
            Gợi ý cách viết mô tả công việc
          </h2>
          <ul className={styles.tipsList}>
            <li>Có mục "Yêu cầu công việc" hoặc "Yêu cầu:". Mục "Quyền lợi", "Phúc lợi" không được phân tích.</li>
            <li>Mỗi yêu cầu một dòng, bắt đầu bằng dấu "-" hoặc "•".</li>
            <li>Yêu cầu bắt buộc: dùng "Tối thiểu", "Bắt buộc", "Thành thạo", "Phải có".</li>
            <li>Yêu cầu ưu tiên: dùng "Ưu tiên", "là lợi thế", "Biết thêm".</li>
            <li>Ghi rõ số năm: "Tối thiểu 2 năm kinh nghiệm kế toán tổng hợp".</li>
          </ul>
          <p className={styles.tipsLabel}>Ví dụ</p>
          <pre className={styles.example}>{JD_EXAMPLE}</pre>
        </aside>
      </div>

      {isEdit && (
        <section className={styles.section} aria-labelledby="requirements-title">
          <div className={styles.sectionHeader}>
            <h2 id="requirements-title">Yêu cầu tách từ mô tả công việc</h2>
            <div className={styles.sectionActions}>
              {/* Bảng dưới chỉ đọc; đổi loại, thêm, xóa yêu cầu ở trang riêng (T34) */}
              <Link className={styles.secondaryLink} to={`/recruiter/jobs/${jobId}/requirements`}>
                Chỉnh sửa yêu cầu
              </Link>
              <Button variant="secondary" onClick={handleParse} loading={parsing} disabled={jdDirty}>
                {parsing ? 'Đang phân tích...' : requirements.length > 0 ? 'Phân tích lại yêu cầu' : 'Phân tích yêu cầu'}
              </Button>
            </div>
          </div>

          {jdDirty && <p className={styles.muted}>Lưu thay đổi mô tả công việc trước khi phân tích.</p>}
          {needsReparse && (
            <p className={styles.alertWarning} role="status">
              Mô tả công việc đã thay đổi sau lần phân tích gần nhất. Vui lòng phân tích lại yêu cầu.
            </p>
          )}
          {parseError && (
            <p className={styles.alertError} role="alert">
              {parseError}
            </p>
          )}
          {parseResult && (
            <p className={styles.alertSuccess} role="status">
              {parseResult.count > 0
                ? `Đã phân tích, tìm được ${parseResult.count} yêu cầu.`
                : 'Chưa tách được yêu cầu nào. Kiểm tra mô tả công việc có mục "Yêu cầu công việc" và mỗi yêu cầu một dòng.'}
            </p>
          )}
          {/* Chế độ rule: yêu cầu không có từ khóa bắt buộc / ưu tiên thì tạm để Ưu tiên */}
          {parseResult && parseResult.mode === 'rule' && parseResult.unresolvedCount > 0 && (
            <p className={styles.alertWarning} role="status">
              {parseResult.unresolvedCount} yêu cầu chưa phân loại chắc chắn, đang để Ưu tiên. Vui lòng kiểm tra lại.
            </p>
          )}

          {parsing ? (
            <Loading text="Đang phân tích yêu cầu..." />
          ) : (
            <Table
              columns={REQUIREMENT_COLUMNS}
              data={requirements}
              emptyText="Chưa có yêu cầu. Ứng viên chỉ được đối chiếu sau khi phân tích yêu cầu."
            />
          )}
        </section>
      )}

      <Modal
        open={askParse !== null}
        onClose={() => setAskParse(null)}
        title={askParse === 'changed' ? 'Phân tích lại yêu cầu?' : 'Phân tích yêu cầu ngay?'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAskParse(null)}>
              Để sau
            </Button>
            <Button onClick={handleParse}>Phân tích ngay</Button>
          </>
        }
      >
        <p className={styles.modalText}>
          {askParse === 'changed'
            ? 'Mô tả công việc vừa thay đổi nên yêu cầu cũ không còn khớp. Phân tích lại sẽ thay toàn bộ yêu cầu cũ.'
            : 'Đã tạo tin tuyển dụng. Phân tích yêu cầu để đối chiếu với hồ sơ ứng viên.'}
        </p>
      </Modal>
    </>
  )
}

export default JobForm
