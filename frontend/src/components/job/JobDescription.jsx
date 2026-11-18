import { parseJobDescription } from '../../utils/jobText'
import styles from './JobDescription.module.css'

// Nội dung mô tả công việc tách theo tiêu đề phần (Mô tả / Yêu cầu / Ưu tiên / Quyền lợi...) nếu HR có ghi tiêu đề,
// giữ gạch đầu dòng và xuống dòng (T35f, tách khỏi trang chi tiết tin ở T35j để trang chi tiết đối chiếu dùng chung).
// JD không có tiêu đề nào thì cả nội dung nằm dưới "Mô tả công việc".
//   headingLevel: 2 ở trang chi tiết tin, 3 khi khối nằm dưới một h2 (trang chi tiết đối chiếu)
//   wide: vùng chữ rộng bằng form (--form-max) thay vì --text-measure, để thẻ nội dung của trang chi tiết tin
//         không còn nửa thẻ trống bên phải (T35j)
function JobDescription({ description, headingLevel = 2, wide = false }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  const sections = parseJobDescription(description)
  const single = sections.length === 1 && !sections[0].heading

  return sections.map((section, index) => (
    <section key={index} className={wide ? `${styles.section} ${styles.wide}` : styles.section}>
      {(section.heading || single) && (
        <Heading className={styles.sectionTitle}>{section.heading || 'Mô tả công việc'}</Heading>
      )}
      {section.blocks.map((block, blockIndex) =>
        block.type === 'list' ? (
          <ul key={blockIndex} className={styles.list}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={blockIndex} className={styles.paragraph}>
            {block.text}
          </p>
        )
      )}
    </section>
  ))
}

export default JobDescription
