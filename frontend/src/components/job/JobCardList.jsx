import styles from './JobCard.module.css'

// Lưới thẻ tin (T35f): 2 cột trên máy tính, 1 cột dưới 900px. columns={3}: 3 cột từ 900px
// (mục "Vị trí khác đang tuyển", chỉ 3 thẻ trên một hàng)
function JobCardList({ columns = 2, children }) {
  return <ul className={columns === 3 ? `${styles.grid} ${styles.grid3}` : styles.grid}>{children}</ul>
}

export default JobCardList
