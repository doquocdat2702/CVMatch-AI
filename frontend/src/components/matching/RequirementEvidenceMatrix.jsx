import { Link } from 'react-router-dom'
import Table from '../common/Table'
import { formatNumber } from '../../utils/format'
import { REQUIREMENT_TYPE_LABEL } from '../../utils/labels'
import MatchStatusBadge from './MatchStatusBadge'
import styles from './RequirementEvidenceMatrix.module.css'

// Bằng chứng tìm thấy ở phần nào của hồ sơ (tên bảng do backend trả về)
const EVIDENCE_SOURCE_LABEL = {
  CandidateSkill: 'Kỹ năng',
  CandidateExperience: 'Kinh nghiệm',
  CandidateEducation: 'Học vấn',
}

// Thứ tự nhóm (T35j): Bắt buộc, Ưu tiên, Không bắt buộc; loại lạ (nếu có) xếp cuối
const TYPE_ORDER = ['REQUIRED', 'PREFERRED', 'OPTIONAL']

// So hai chuỗi bỏ khác biệt hoa thường / khoảng trắng: câu gốc trùng tên tiêu chí thì không in lại
function sameText(a, b) {
  const clean = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi')
  return clean(a) === clean(b)
}

// Tiêu đề dòng là tên tiêu chí đang đối chiếu (normalizedName, vd "SQL"); câu gốc trong mô tả công việc là chữ nhỏ
// bên dưới. Một câu JD tách thành nhiều yêu cầu ("MySQL, PostgreSQL") nên câu gốc có thể giống nhau giữa các dòng,
// còn tên tiêu chí thì khác: hai dòng không còn trông giống hệt nhau
function RequirementCell({ row }) {
  const { requirement } = row
  const title = requirement.normalizedName || requirement.rawText
  return (
    <div className={`${styles.cell} ${styles.requirementCell}`}>
      <span className={styles.requirementTitle}>{title}</span>
      {requirement.rawText && !sameText(requirement.rawText, title) && (
        <span className={styles.rawText}>{requirement.rawText}</span>
      )}
      {requirement.minYears ? <span className={styles.muted}>Tối thiểu {requirement.minYears} năm</span> : null}
    </div>
  )
}

function EvidenceCell({ row, notFoundLink }) {
  // NOT_FOUND (hoặc không có evidence) thì ghi rõ "Không tìm thấy", kèm link sửa hồ sơ nếu trang truyền vào
  if (row.status === 'NOT_FOUND' || !row.evidence) {
    return (
      <div className={styles.cell}>
        <span className={styles.muted}>Không tìm thấy</span>
        {notFoundLink && (
          <Link className={styles.notFoundLink} to={notFoundLink.to}>
            {notFoundLink.label}
          </Link>
        )}
      </div>
    )
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

// Ma trận yêu cầu - bằng chứng. Component thuần: chỉ nhận dữ liệu qua props, không gọi API,
// nên trang của ứng viên và của nhà tuyển dụng dùng chung được.
// T35j: chia nhóm theo loại yêu cầu (tiêu đề nhóm kèm số dòng, h3), bỏ Badge loại ở từng dòng;
// bỏ dòng tổng kết dưới bảng vì cả hai nơi dùng đã hiện "x/y yêu cầu có bằng chứng (z%)" ở đầu.
// Badge trạng thái có chú thích một câu (MatchStatusBadge: title + bấm để hiện), thay khối "Cách đọc bảng này".
//   matrix:       mảng dòng từ API matching: [{ requirement, type, evidence, status }]
//   note:         câu nhắc của API (coverage không phải điểm năng lực). CHỈ phía nhà tuyển dụng truyền vào;
//                 màn hình ứng viên không hiện note (T35j, CLAUDE.md mục 5)
//   emptyText:    câu hiện khi job chưa có yêu cầu nào
//   notFoundLink: { to, label } link nhỏ ở dòng "Không tìm thấy" (trang ứng viên: "Cập nhật hồ sơ")
function RequirementEvidenceMatrix({
  matrix = [],
  note,
  emptyText = 'Tin tuyển dụng chưa có yêu cầu để đối chiếu',
  notFoundLink,
}) {
  // Table dùng id làm key của hàng: lấy id của requirement
  const rows = matrix.map((row) => ({ ...row, id: row.requirement.id }))

  const columns = [
    { key: 'requirement', title: 'Yêu cầu', render: (row) => <RequirementCell row={row} /> },
    {
      key: 'evidence',
      title: 'Bằng chứng trong hồ sơ',
      render: (row) => <EvidenceCell row={row} notFoundLink={notFoundLink} />,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <MatchStatusBadge status={row.status} />,
    },
  ]

  const knownTypes = TYPE_ORDER.filter((type) => rows.some((row) => row.type === type))
  const otherRows = rows.filter((row) => !TYPE_ORDER.includes(row.type))
  const groups = knownTypes.map((type) => ({
    key: type,
    label: REQUIREMENT_TYPE_LABEL[type],
    rows: rows.filter((row) => row.type === type),
  }))
  if (otherRows.length > 0) groups.push({ key: 'OTHER', label: 'Khác', rows: otherRows })

  return (
    <div className={styles.matrix}>
      {groups.length === 0 ? (
        <Table columns={columns} data={[]} emptyText={emptyText} />
      ) : (
        groups.map((group) => (
          <section key={group.key} className={styles.group}>
            <h3 className={styles.groupTitle}>
              {group.label} ({group.rows.length})
            </h3>
            <Table columns={columns} data={group.rows} />
          </section>
        ))
      )}
      {note && <p className={styles.note}>{note}</p>}
    </div>
  )
}

export default RequirementEvidenceMatrix
