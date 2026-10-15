import { useEffect, useState } from 'react'
import { getAdminDashboard } from '../../api/admin.api'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import BarChart from '../../components/dashboard/BarChart'
import StatCard from '../../components/dashboard/StatCard'
import { getErrorMessage } from '../../utils/apiError'
import { formatNumber } from '../../utils/format'
import { CV_STATUS_LABEL } from '../../utils/labels'
import { ROLE_LABEL } from '../../utils/roles'
import styles from './Dashboard.module.css'

// "2026-10" -> "10/2026". Tách chuỗi, không qua Date để không lệch tháng theo múi giờ
function monthLabel(value) {
  const [year, month] = value.split('-')
  return `${month}/${year}`
}

function countOf(items, status) {
  const found = items.find((item) => item.status === status)
  return found ? found.count : 0
}

// Trang Tổng quan của quản trị viên (trang mặc định sau khi đăng nhập). Không tự làm mới số liệu.
function AdminDashboard() {
  // Kết quả gắn với khóa của lần gọi: khóa khác khóa hiện tại nghĩa là đang tải
  const [result, setResult] = useState({ key: null, data: null, error: '' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    getAdminDashboard()
      .then((response) => {
        if (!ignore) setResult({ key: reloadKey, data: response.data, error: '' })
      })
      .catch((err) => {
        if (!ignore) setResult({ key: reloadKey, data: null, error: getErrorMessage(err, 'Không tải được số liệu') })
      })
    return () => {
      ignore = true
    }
  }, [reloadKey])

  let content
  if (result.key !== reloadKey) {
    content = <Loading text="Đang tải số liệu..." />
  } else if (result.error) {
    content = (
      <>
        <p className={styles.alertError} role="alert">
          {result.error}
        </p>
        <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
          Thử lại
        </Button>
      </>
    )
  } else {
    const data = result.data

    // Tỷ lệ thành công = COMPLETED / (COMPLETED + FAILED). Chưa có CV nào xử lý xong thì backend trả 0,
    // hiện "Chưa có dữ liệu" thay vì 0% để không hiểu nhầm là toàn bộ thất bại
    const completed = countOf(data.cvByStatus, 'COMPLETED')
    const finished = completed + countOf(data.cvByStatus, 'FAILED')

    const newUsers = data.newUsersByMonth.map(({ month, count }) => ({
      key: month,
      label: monthLabel(month),
      tooltip: `Tháng ${monthLabel(month)}`,
      value: count,
    }))
    const cvs = data.cvByStatus.map(({ status, count }) => ({
      key: status,
      label: CV_STATUS_LABEL[status] || status,
      value: count,
    }))

    content = (
      <>
        <section className={styles.group}>
          <h2>Tài khoản</h2>
          <div className={styles.stats}>
            {data.usersByRole.map(({ role, count }) => (
              <StatCard key={role} label={ROLE_LABEL[role] || role} value={formatNumber(count)} />
            ))}
            <StatCard label="Tài khoản bị khóa" value={formatNumber(data.lockedUsers)} hint="Tính cả 3 vai trò" />
          </div>
        </section>

        <section className={styles.group}>
          <h2>Tuyển dụng và CV</h2>
          <div className={styles.stats}>
            <StatCard
              label="Tin tuyển dụng"
              value={formatNumber(data.jobs.total)}
              hint={`${formatNumber(data.jobs.open)} tin đang mở`}
            />
            <StatCard label="Đơn ứng tuyển" value={formatNumber(data.applications.total)} />
            <StatCard
              label="Tỷ lệ xử lý CV thành công"
              value={`${formatNumber(data.cvSuccessRate * 100)}%`}
              hint={`${formatNumber(completed)}/${formatNumber(finished)} CV xử lý thành công, không tính CV chưa xử lý xong`}
              empty={finished === 0}
            />
          </div>
        </section>

        <div className={styles.charts}>
          <section className={styles.chartSection}>
            <h2>Người dùng mới theo tháng</h2>
            <p className={styles.sub}>6 tháng gần nhất, tính cả tháng này.</p>
            <BarChart
              title="Người dùng mới theo tháng, 6 tháng gần nhất"
              data={newUsers}
              xLabel="Tháng"
              yLabel="Số tài khoản"
            />
          </section>

          <section className={styles.chartSection}>
            <h2>CV theo trạng thái</h2>
            <p className={styles.sub}>Toàn bộ CV ứng viên đã tải lên.</p>
            <BarChart title="CV theo trạng thái" data={cvs} xLabel="Trạng thái" yLabel="Số CV" />
          </section>
        </div>
      </>
    )
  }

  return (
    <>
      <h1>Tổng quan</h1>
      <p className={styles.intro}>Số liệu toàn hệ thống: tài khoản, tuyển dụng và xử lý CV.</p>
      {content}
    </>
  )
}

export default AdminDashboard
