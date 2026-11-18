import { LocationIcon, MailIcon, PhoneIcon } from '../layout/FooterIcons'
import { buildCVData } from './cvData'
import styles from './CVTemplateProfessional.module.css'

// Liên hệ theo thứ tự Số điện thoại, Email, Địa chỉ; mỗi dòng một icon SVG viết tay (dùng lại FooterIcons,
// ngoại lệ icon chức năng đã duyệt). Trường trống thì buildCVData đã bỏ cả dòng
const CONTACT_ORDER = ['phone', 'email', 'address']
const CONTACT_ICON = { phone: PhoneIcon, email: MailIcon, address: LocationIcon }

// Mẫu Chuyên nghiệp (T35k, sắp lại ở T35l): A4 dọc, hai cột.
// - Cột trái nền Mực đen chữ sáng, CHỈ có: ảnh, họ tên, tiêu đề hồ sơ, Liên hệ.
// - Cột phải nền trắng, theo thứ tự: Mục tiêu nghề nghiệp -> Kỹ năng (thẻ nằm ngang, tự xuống dòng) -> Kinh nghiệm
//   làm việc -> Học vấn. Mục không có dữ liệu thì ẩn cả tiêu đề mục.
// Không có thanh mức độ / phần trăm / sao cho kỹ năng: hệ thống không lưu mức độ thành thạo.
// Bố cục in (CVTemplateProfessional.module.css):
// - Nền cột trái là một lớp riêng (sideBg): trên màn hình phủ hết chiều cao CV, khi in là position: fixed nên
//   Chrome vẽ lại trên MỌI trang, kể cả khi CV sang trang thứ hai.
// - Trang in tên riêng "cv-pro" lề 0 để nền tối chạm mép giấy; khoảng trống trên / dưới mỗi trang do thead / tfoot
//   của bảng khung tạo ra (Chrome lặp lại thead / tfoot ở mỗi trang). Bảng chỉ để dàn trang nên role="presentation".
function CVTemplateProfessional({ profile }) {
  const cv = buildCVData(profile)
  const contacts = CONTACT_ORDER.map((type) => cv.contacts.find((contact) => contact.type === type)).filter(Boolean)

  return (
    <article className={styles.cv}>
      <div className={styles.sideBg} aria-hidden="true" />

      <table className={styles.sheet} role="presentation">
        {/* Bảng table-layout: fixed lấy độ rộng cột từ hàng đầu tiên; hàng đầu là ô thead gộp 2 cột nên phải khai báo
            độ rộng ở colgroup, không thì trình duyệt chia đôi 50 / 50 và chữ cột trái tràn ra ngoài nền tối */}
        <colgroup>
          <col className={styles.sideCol} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <td colSpan={2} className={styles.pageSpace} />
          </tr>
        </thead>
        <tfoot>
          <tr>
            <td colSpan={2} className={styles.pageSpace} />
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td className={styles.side}>
              {cv.avatar ? (
                <img className={styles.avatar} src={cv.avatar} alt="" />
              ) : (
                <span className={styles.initials} aria-hidden="true">
                  {cv.initials}
                </span>
              )}
              <h1 className={styles.name}>{cv.fullName}</h1>
              {cv.headline && <p className={styles.headline}>{cv.headline}</p>}

              {contacts.length > 0 && (
                <section className={styles.sideSection}>
                  <h2 className={styles.sideTitle}>Liên hệ</h2>
                  <ul className={styles.contacts}>
                    {contacts.map((contact) => {
                      const Icon = CONTACT_ICON[contact.type]
                      return (
                        <li key={contact.type} className={styles.contact}>
                          <Icon />
                          <span className={styles.contactValue}>
                            <span className={styles.srOnly}>{contact.label}: </span>
                            {contact.value}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
            </td>

            <td className={styles.main}>
              {cv.objective && (
                <section className={styles.mainSection}>
                  <h2 className={styles.mainTitle}>Mục tiêu nghề nghiệp</h2>
                  <p className={styles.objective}>{cv.objective}</p>
                </section>
              )}

              {cv.skills.length > 0 && (
                <section className={styles.mainSection}>
                  <h2 className={styles.mainTitle}>Kỹ năng</h2>
                  <ul className={styles.skills}>
                    {cv.skills.map((skill) => (
                      <li key={skill} className={styles.skill}>
                        {skill}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {cv.experiences.length > 0 && (
                <section className={styles.mainSection}>
                  <h2 className={styles.mainTitle}>Kinh nghiệm làm việc</h2>
                  {cv.experiences.map((experience) => (
                    <div key={experience.id} className={styles.entry}>
                      <div className={styles.entryHead}>
                        <p className={styles.entryTitle}>{experience.position}</p>
                        {experience.period && <p className={styles.period}>{experience.period}</p>}
                      </div>
                      {experience.companyName && <p className={styles.entrySub}>{experience.companyName}</p>}
                      {experience.descriptionLines.length > 0 && (
                        <ul className={styles.bullets}>
                          {experience.descriptionLines.map((line, index) => (
                            <li key={index}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </section>
              )}

              {cv.educations.length > 0 && (
                <section className={styles.mainSection}>
                  <h2 className={styles.mainTitle}>Học vấn</h2>
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
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  )
}

export default CVTemplateProfessional
