import styles from './UnderConstruction.module.css'

// Trang tạm cho mục menu chưa có chức năng, hiển thị bên trong MainLayout
// để vẫn thấy mục menu đang chọn. Các task sau thay bằng trang thật.
function UnderConstruction() {
  return (
    <>
      <h1>Chức năng đang được xây dựng</h1>
      <p className={styles.text}>Trang này sẽ được bổ sung ở các bước tiếp theo.</p>
    </>
  )
}

export default UnderConstruction
