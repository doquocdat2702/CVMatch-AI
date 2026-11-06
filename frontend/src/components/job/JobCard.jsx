import { Link } from 'react-router-dom'
import { formatPostedAt } from '../../utils/format'
import { summarizeJobDescription } from '../../utils/jobText'
import Badge from '../common/Badge'
import styles from './JobCard.module.css'

// Thẻ một tin tuyển dụng (T35f), dùng ở trang chủ và mục "Vị trí khác đang tuyển" của trang chi tiết tin.
// Cả thẻ bấm được nhưng chỉ có MỘT link: link ở tiêu đề phủ kín thẻ bằng ::after, tên link chính là tên tin.
// Thông tin chỉ lấy trường có thật của Job: tiêu đề, địa điểm, đoạn đầu JD, ngày đăng.
//   job: { id, title, location, description, createdAt }; applied: ứng viên đã nộp đơn tin này
//   headingLevel: 2 ở trang chủ, 3 khi thẻ nằm dưới một h2 (trang chi tiết tin)
function JobCard({ job, applied = false, headingLevel = 2 }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  const summary = summarizeJobDescription(job.description)

  return (
    <li className={styles.card}>
      <Heading className={styles.title}>
        <Link className={styles.link} to={`/jobs/${job.id}`}>
          {job.title}
        </Link>
      </Heading>
      {job.location && <p className={styles.meta}>{job.location}</p>}
      {summary && <p className={styles.summary}>{summary}</p>}
      <div className={styles.footer}>
        <span className={styles.posted}>{formatPostedAt(job.createdAt)}</span>
        {applied && <Badge status="APPLIED">Đã ứng tuyển</Badge>}
      </div>
    </li>
  )
}

export default JobCard
