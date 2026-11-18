import { buildCVData } from './cvData'
import styles from './CVTemplateModern.module.css'

// Mẫu Hiện đại: hai cột, trái là liên hệ + kỹ năng (thẻ nằm ngang, T35l), phải là kinh nghiệm + học vấn.
// Cùng dữ liệu với mẫu Cổ điển (buildCVData), chỉ khác bố cục và CSS.
function CVTemplateModern({ profile }) {
  const cv = buildCVData(profile)

  return (
    <article className={styles.cv}>
      <header className={styles.header}>
        <h1 className={styles.name}>{cv.fullName}</h1>
        {cv.headline && <p className={styles.headline}>{cv.headline}</p>}
      </header>

      {/* T35k: mục tiêu nghề nghiệp ngay dưới họ tên / tiêu đề hồ sơ, trên hai cột; trống thì ẩn cả mục */}
      {cv.objective && (
        <section className={styles.objectiveSection}>
          <h2 className={styles.sectionTitle}>Mục tiêu nghề nghiệp</h2>
          <p className={styles.objective}>{cv.objective}</p>
        </section>
      )}

      <div className={styles.columns}>
        <div className={styles.side}>
          {cv.contacts.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Liên hệ</h2>
              <dl className={styles.contacts}>
                {cv.contacts.map((contact) => (
                  <div key={contact.label}>
                    <dt className={styles.contactLabel}>{contact.label}</dt>
                    <dd className={styles.contactValue}>{contact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {cv.skills.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Kỹ năng</h2>
              <ul className={styles.skills}>
                {cv.skills.map((skill) => (
                  <li key={skill} className={styles.skill}>
                    {skill}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className={styles.main}>
          {cv.experiences.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Kinh nghiệm làm việc</h2>
              {cv.experiences.map((experience) => (
                <div key={experience.id} className={styles.entry}>
                  <p className={styles.entryTitle}>{experience.position}</p>
                  {(experience.companyName || experience.period) && (
                    <p className={styles.entrySub}>
                      {experience.companyName}
                      {experience.companyName && experience.period && ', '}
                      {experience.period}
                    </p>
                  )}
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
                  <p className={styles.entryTitle}>{education.school}</p>
                  {/* T35l: bằng cấp / ngành và thời gian chung một dòng, như dòng "công ty, thời gian" của kinh nghiệm */}
                  {(education.detail || education.period) && (
                    <p className={styles.entrySub}>
                      {education.detail}
                      {education.detail && education.period && ', '}
                      {education.period}
                    </p>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </article>
  )
}

export default CVTemplateModern
