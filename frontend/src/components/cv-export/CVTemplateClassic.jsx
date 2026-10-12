import { buildCVData } from './cvData'
import styles from './CVTemplateClassic.module.css'

// Mẫu Cổ điển: một cột, tiêu đề mục gạch chân, chỉ dùng màu chữ đen nên in đen trắng vẫn rõ.
// Chỉ lo hiển thị: không hook, không gọi API, dữ liệu do buildCVData chuẩn bị.
function CVTemplateClassic({ profile }) {
  const cv = buildCVData(profile)

  return (
    <article className={styles.cv}>
      <header className={styles.header}>
        <h1 className={styles.name}>{cv.fullName}</h1>
        {cv.headline && <p className={styles.headline}>{cv.headline}</p>}
        {cv.contacts.length > 0 && (
          <ul className={styles.contacts}>
            {cv.contacts.map((contact) => (
              <li key={contact.label}>
                <span className={styles.contactLabel}>{contact.label}:</span> {contact.value}
              </li>
            ))}
          </ul>
        )}
      </header>

      {/* Mục rỗng thì ẩn luôn cả tiêu đề mục */}
      {cv.skills.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Kỹ năng</h2>
          <p className={styles.skills}>{cv.skills.join(', ')}</p>
        </section>
      )}

      {cv.experiences.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Kinh nghiệm làm việc</h2>
          {cv.experiences.map((experience) => (
            <div key={experience.id} className={styles.entry}>
              <div className={styles.entryHead}>
                <p className={styles.entryTitle}>{experience.position}</p>
                {experience.period && <p className={styles.period}>{experience.period}</p>}
              </div>
              {experience.companyName && <p className={styles.entrySub}>{experience.companyName}</p>}
              {experience.description && <p className={styles.description}>{experience.description}</p>}
            </div>
          ))}
        </section>
      )}

      {cv.educations.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Học vấn</h2>
          {cv.educations.map((education) => (
            <div key={education.id} className={styles.entry}>
              <div className={styles.entryHead}>
                <p className={styles.entryTitle}>{education.school}</p>
                {education.period && <p className={styles.period}>{education.period}</p>}
              </div>
              {education.detail && <p className={styles.entrySub}>{education.detail}</p>}
            </div>
          ))}
        </section>
      )}
    </article>
  )
}

export default CVTemplateClassic
