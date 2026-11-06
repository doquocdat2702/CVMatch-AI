import styles from './JobCard.module.css'

// Khung xương thay cho chữ "Đang tải" khi danh sách tin đang tải (T35f): cùng lưới và cỡ với thẻ thật nên
// tải xong trang không nhảy. Các thanh chỉ để nhìn (aria-hidden); trình đọc màn hình đọc dòng chữ ẩn.
//   count: số thẻ giả; text: câu cho trình đọc màn hình
function JobCardSkeleton({ count = 4, columns = 2, text = 'Đang tải việc làm...' }) {
  return (
    <div role="status" aria-busy="true">
      <span className={styles.srOnly}>{text}</span>
      <ul className={columns === 3 ? `${styles.grid} ${styles.grid3}` : styles.grid} aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className={`${styles.card} ${styles.skeletonCard}`}>
            <span className={`${styles.bone} ${styles.boneTitle}`} />
            <span className={`${styles.bone} ${styles.boneMeta}`} />
            <span className={`${styles.bone} ${styles.boneLine}`} />
            <span className={`${styles.bone} ${styles.boneLineShort}`} />
            <span className={`${styles.bone} ${styles.boneFooter}`} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default JobCardSkeleton
