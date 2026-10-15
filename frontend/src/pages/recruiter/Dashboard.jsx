import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getRecruiterDashboard } from '../../api/recruiter.api'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import BarChart from '../../components/dashboard/BarChart'
import StatCard from '../../components/dashboard/StatCard'
import { getErrorMessage } from '../../utils/apiError'
import { formatNumber } from '../../utils/format'
import { APPLICATION_STATUS_LABEL } from '../../utils/labels'
import styles from './Dashboard.module.css'

// Phạm vi số liệu, khớp ?scope=mine|all của GET /recruiters/dashboard
const SCOPES = [
  { value: 'mine', label: 'Job của tôi', intro: 'các tin do bạn đăng' },
  { value: 'all', label: 'Toàn công ty', intro: 'mọi tin của công ty' },
]

const COVERAGE_CAPTION = 'Coverage là mức đáp ứng yêu cầu, không phải điểm năng lực.'

// Biểu đồ 30 ngày quá dày để ghi hết ngày: chỉ ghi mỗi 5 ngày, tính lùi từ hôm nay (cột cuối luôn có nhãn)
const DAY_LABEL_EVERY = 5

// "2026-10-15" -> { short: "15/10", full: "15/10/2026" }. Tách chuỗi, không qua Date để không lệch ngày theo múi giờ
function splitDate(value) {
  const [year, month, day] = value.split('-')
  return { short: `${day}/${month}`, full: `${day}/${month}/${year}` }
}

// "0-20" -> "0–20%"
function coverageRangeLabel(range) {
  return `${range.replace('-', '–')}%`
}

// Đổi dữ liệu API sang dạng BarChart cần: [{ key, label, value, tooltip }]
function toChartData(data) {
  const days = data.applicationsByDay
  return {
    byStatus: data.applicationsByStatus.map(({ status, count }) => ({
      key: status,
      label: APPLICATION_STATUS_LABEL[status] || status,
      value: count,
    })),
    byDay: days.map(({ date, count }, index) => {
      const { short, full } = splitDate(date)
      return {
        key: date,
        label: (days.length - 1 - index) % DAY_LABEL_EVERY === 0 ? short : '',
        tooltip: full,
        value: count,
      }
    }),
    coverage: data.coverageDistribution.map(({ range, count }) => ({
      key: range,
      label: coverageRangeLabel(range),
      tooltip: `Coverage ${coverageRangeLabel(range)}`,
      value: count,
    })),
  }
}

// Trang Tổng quan của nhà tuyển dụng (trang mặc định sau khi đăng nhập).
// Phạm vi nằm trên URL (?scope=all), tải lại trang vẫn giữ; không tự làm mới số liệu.
function RecruiterDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scope = searchParams.get('scope') === 'all' ? 'all' : 'mine'
  const scopeConfig = SCOPES.find((item) => item.value === scope)

  // Kết quả gắn với khóa của lần gọi: khóa khác khóa hiện tại nghĩa là đang tải
  const [result, setResult] = useState({ key: null, data: null, error: '' })
  const [reloadKey, setReloadKey] = useState(0)
  const requestKey = `${scope}|${reloadKey}`

  useEffect(() => {
    let ignore = false
    getRecruiterDashboard(scope)
      .then((response) => {
        if (!ignore) setResult({ key: requestKey, data: response.data, error: '' })
      })
      .catch((err) => {
        if (!ignore) setResult({ key: requestKey, data: null, error: getErrorMessage(err, 'Không tải được số liệu') })
      })
    return () => {
      ignore = true
    }
  }, [scope, requestKey])

  function handleScopeChange(value) {
    if (value === scope) return
    setSearchParams(value === 'mine' ? {} : { scope: value }, { replace: true })
  }

  let content
  if (result.key !== requestKey) {
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
    const { summary, note } = result.data
    const charts = toChartData(result.data)
    content = (
      <>
        <div className={styles.stats}>
          <StatCard label="Tin đang mở" value={formatNumber(summary.openJobs)} />
          <StatCard label="Tổng số đơn ứng tuyển" value={formatNumber(summary.totalApplications)} />
          <StatCard
            label="Đơn mới trong 7 ngày"
            value={formatNumber(summary.newApplicationsLast7Days)}
            hint="Tính cả hôm nay"
          />
        </div>

        <div className={styles.charts}>
          <section className={styles.chartSection}>
            <h2>Đơn theo trạng thái</h2>
            <BarChart title="Đơn theo trạng thái" data={charts.byStatus} xLabel="Trạng thái" yLabel="Số đơn" />
          </section>

          <section className={styles.chartSection}>
            <h2>Phân bố coverage lúc nộp</h2>
            <BarChart
              title="Phân bố coverage lúc nộp"
              data={charts.coverage}
              xLabel="Coverage lúc nộp"
              yLabel="Số đơn"
            />
            <p className={styles.caption}>{COVERAGE_CAPTION}</p>
            {/* Câu nhắc của API luôn đi kèm số liệu coverage */}
            {note && <p className={styles.note}>{note}</p>}
            <p className={styles.note}>
              Đơn nộp lúc tin chưa có yêu cầu (chưa phân tích JD) không có coverage nên không nằm trong biểu đồ này.
            </p>
          </section>

          <section className={`${styles.chartSection} ${styles.wide}`}>
            <h2>Đơn theo ngày</h2>
            <p className={styles.sub}>30 ngày gần nhất, tính cả hôm nay. Rê chuột lên cột để xem số đơn của từng ngày.</p>
            <BarChart title="Đơn theo ngày, 30 ngày gần nhất" data={charts.byDay} xLabel="Ngày nộp" yLabel="Số đơn" />
          </section>
        </div>
      </>
    )
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Tổng quan</h1>
        {/* aria-pressed cho biết nút nào đang chọn, không chỉ dựa vào màu */}
        <div className={styles.scope} role="group" aria-label="Phạm vi số liệu">
          {SCOPES.map((item) => (
            <button
              key={item.value}
              type="button"
              className={item.value === scope ? `${styles.scopeButton} ${styles.scopeActive}` : styles.scopeButton}
              aria-pressed={item.value === scope}
              onClick={() => handleScopeChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.intro}>Số liệu tính trên {scopeConfig.intro}.</p>

      {content}
    </>
  )
}

export default RecruiterDashboard
