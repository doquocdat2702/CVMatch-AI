import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import styles from './MainLayout.module.css'

// Khung chung cho các trang sau khi đăng nhập: Header trên cùng, Sidebar bên trái,
// trang con hiển thị tại <Outlet /> trong vùng nội dung
function MainLayout() {
  return (
    <div className={styles.layout}>
      <Header />
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.content}>
          <div className={styles.inner}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default MainLayout
