import styles from './StatCard.module.css'

// Ô số liệu trên trang Tổng quan: nhãn ở trên, con số lớn ở dưới, dòng phụ nhỏ (tùy chọn).
// label: viết thường, không dấu hai chấm; value: con số đã định dạng (vd formatNumber(12), "75%");
// hint: giải thích thêm; empty: chưa có dữ liệu để tính (vd tỷ lệ khi chưa có CV nào xử lý xong)
// thì hiện "Chưa có dữ liệu" thay cho con số, tránh hiện 0% gây hiểu nhầm.
function StatCard({ label, value, hint, empty = false }) {
  return (
    <div className={styles.card}>
      <p className={styles.label}>{label}</p>
      {empty ? <p className={styles.empty}>Chưa có dữ liệu</p> : <p className={styles.value}>{value}</p>}
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}

export default StatCard
