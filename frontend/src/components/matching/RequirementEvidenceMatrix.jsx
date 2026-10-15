import Badge from '../common/Badge'
import Table from '../common/Table'
import { formatNumber } from '../../utils/format'
import { MATCH_STATUS_LABEL, REQUIREMENT_TYPE_LABEL } from '../../utils/labels'
import styles from './RequirementEvidenceMatrix.module.css'

// Bằng chứng tìm thấy ở phần nào của hồ sơ (tên bảng do backend trả về)
const EVIDENCE_SOURCE_LABEL = {
  CandidateSkill: 'Kỹ năng',
  CandidateExperience: 'Kinh nghiệm',
  CandidateEducation: 'Học vấn',
}

function RequirementCell({ row }) {
  const { requirement } = row
  return (
    <div className={`${styles.cell} ${styles.requirementCell}`}>
      <span className={styles.requirementText}>{requirement.rawText}</span>
      <span className={styles.meta}>
        <Badge status={row.type}>{REQUIREMENT_TYPE_LABEL[row.type] || row.type}</Badge>
        {requirement.minYears ? <span>Tối thiểu {requirement.minYears} năm</span> : null}
      </span>
      {requirement.normalizedName && requirement.normalizedName !== requirement.rawText && (
        <span className={styles.muted}>Đối chiếu theo: {requirement.normalizedName}</span>
      )}
    </div>
  )
}

function EvidenceCell({ row }) {
  // NOT_FOUND (hoặc không có evidence) thì ghi rõ "Không tìm thấy"
  if (row.status === 'NOT_FOUND' || !row.evidence) {
    return <span className={styles.muted}>Không tìm thấy</span>
  }

  const { evidence } = row
  const hasYears = evidence.minYears !== undefined && evidence.minYears !== null
  return (
    <div className={styles.cell}>
      <span className={styles.evidenceText}>{evidence.text}</span>
      <span className={styles.muted}>
        {EVIDENCE_SOURCE_LABEL[evidence.source] || evidence.source}
        {hasYears && `, kinh nghiệm liên quan ${formatNumber(evidence.totalYears)}/${evidence.minYears} năm`}
      </span>
    </div>
  )
}

const COLUMNS = [
  { key: 'requirement', title: 'Yêu cầu', render: (row) => <RequirementCell row={row} /> },
  { key: 'evidence', title: 'Bằng chứng trong hồ sơ', render: (row) => <EvidenceCell row={row} /> },
  {
    key: 'status',
    title: 'Trạng thái',
    render: (row) => <Badge status={row.status}>{MATCH_STATUS_LABEL[row.status] || row.status}</Badge>,
  },
]

// Ma trận yêu cầu - bằng chứng. Component thuần: chỉ nhận dữ liệu qua props, không gọi API,
// nên trang của ứng viên và của nhà tuyển dụng dùng chung được.
//   matrix:    mảng dòng từ API matching: [{ requirement, type, evidence, status }]
//   note:      câu nhắc của API (coverage không phải điểm năng lực), hiện dưới dòng tổng kết
//   emptyText: câu hiện khi job chưa có yêu cầu nào
function RequirementEvidenceMatrix({ matrix = [], note, emptyText = 'Tin tuyển dụng chưa có yêu cầu để đối chiếu' }) {
  // Table dùng id làm key của hàng: lấy id của requirement
  const rows = matrix.map((row) => ({ ...row, id: row.requirement.id }))
  const supported = rows.filter((row) => row.status === 'SUPPORTED').length

  return (
    <div className={styles.matrix}>
      <Table columns={COLUMNS} data={rows} emptyText={emptyText} />
      {rows.length > 0 && (
        <p className={styles.summary}>
          {supported}/{rows.length} yêu cầu được hỗ trợ
        </p>
      )}
      {note && <p className={styles.note}>{note}</p>}
    </div>
  )
}

export default RequirementEvidenceMatrix
