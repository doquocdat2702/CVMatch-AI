import styles from './SkillTags.module.css'

// Hàng nhãn kỹ năng chính của một tin (T35j): tên Skill do API trả (job.skills, Bắt buộc trước, tối đa 5).
//   max: số nhãn hiện tối đa, phần còn lại gộp thành "+n" (thẻ tin dùng 4); không truyền thì hiện hết
//   label: tên danh sách cho trình đọc màn hình
function SkillTags({ skills, max, label = 'Kỹ năng chính' }) {
  if (!skills || skills.length === 0) return null
  const shown = max ? skills.slice(0, max) : skills
  const rest = skills.length - shown.length

  return (
    <ul className={styles.tags} aria-label={label}>
      {shown.map((skill) => (
        <li key={skill} className={styles.tag}>
          {skill}
        </li>
      ))}
      {rest > 0 && (
        <li className={`${styles.tag} ${styles.more}`}>
          +{rest}
          <span className={styles.srOnly}> kỹ năng khác</span>
        </li>
      )}
    </ul>
  )
}

export default SkillTags
