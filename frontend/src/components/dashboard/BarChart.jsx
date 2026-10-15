import { formatNumber } from '../../utils/format'
import styles from './BarChart.module.css'

// Từ chừng này cột trở xuống thì ghi luôn giá trị trên đỉnh cột.
// Nhiều cột hơn (vd 30 ngày) thì cột quá hẹp, giá trị chỉ hiện khi rê chuột.
const MAX_BARS_WITH_VALUES = 12

// Vạch chia trục dọc: đỉnh, giữa, 0. Đỉnh luôn là số chẵn để vạch giữa là số nguyên
// (số đơn, số tài khoản không có số lẻ)
function getTicks(maxValue) {
  const step = Math.max(1, Math.ceil(maxValue / 2))
  return [step * 2, step, 0]
}

// Cột ở 1/4 đầu: chú thích bám mép trái; 1/4 cuối: bám mép phải; còn lại căn giữa cột.
// Nhờ vậy chú thích của cột sát mép không tràn ra ngoài biểu đồ.
function tooltipClass(index, count) {
  if (index < count / 4) return `${styles.tooltip} ${styles.tipStart}`
  if (index >= (count * 3) / 4) return `${styles.tooltip} ${styles.tipEnd}`
  return styles.tooltip
}

// Biểu đồ nhiều cột (dense): cột hẹp hơn chữ nên nhãn đầu bám mép trái, nhãn cuối bám mép phải
// để không tràn ra ngoài; biểu đồ ít cột thì nhãn luôn căn giữa cột
function xTickClass(index, count, dense) {
  if (dense && index === 0) return `${styles.xTick} ${styles.xTickStart}`
  if (dense && index === count - 1) return `${styles.xTick} ${styles.xTickEnd}`
  return styles.xTick
}

// Biểu đồ cột dọc vẽ bằng div + CSS, không dùng thư viện biểu đồ. Một chuỗi số liệu nên chỉ một màu.
// data: [{ key, label, value, tooltip }]
//   label: chữ dưới cột ('' thì không ghi, dùng khi cột dày như 30 ngày); tooltip: tên đầy đủ khi rê chuột (mặc định = label)
// title: tên biểu đồ, làm tiêu đề bảng số liệu ẩn cho trình đọc màn hình; xLabel, yLabel: nhãn trục
// Tổng các giá trị bằng 0 thì hiện emptyText thay cho biểu đồ
function BarChart({ title, data, xLabel, yLabel, emptyText = 'Chưa có dữ liệu' }) {
  const rows = data || []
  const total = rows.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) {
    return <p className={styles.empty}>{emptyText}</p>
  }

  const ticks = getTicks(Math.max(...rows.map((item) => item.value)))
  const top = ticks[0]
  const dense = rows.length > MAX_BARS_WITH_VALUES
  const showValues = !dense

  return (
    <figure className={styles.chart}>
      {/* Phần vẽ chỉ để nhìn; trình đọc màn hình đọc bảng số liệu ẩn ở cuối */}
      <div className={styles.grid} aria-hidden="true">
        {yLabel && <p className={styles.yLabel}>{yLabel}</p>}

        <div className={styles.yAxis}>
          {ticks.map((tick) => (
            <span key={tick} className={styles.yTick} style={{ bottom: `${(tick / top) * 100}%` }}>
              {formatNumber(tick)}
            </span>
          ))}
        </div>

        <div className={styles.area}>
          {/* Đường kẻ ngang mờ ở vạch đỉnh và giữa; vạch 0 là đường đáy (viền dưới của vùng vẽ) */}
          {ticks
            .filter((tick) => tick > 0)
            .map((tick) => (
              <span key={tick} className={styles.gridline} style={{ bottom: `${(tick / top) * 100}%` }} />
            ))}
          <div className={styles.columns}>
            {rows.map((item, index) => {
              // Chiều cao cột theo % của đỉnh trục, là dữ liệu nên đặt bằng style trực tiếp
              const height = `${(item.value / top) * 100}%`
              return (
                // Cả cột cao hết vùng vẽ là vùng rê chuột, dễ trúng hơn chỉ phần thanh màu
                <div key={item.key} className={styles.column}>
                  <span
                    className={item.value > 0 ? `${styles.bar} ${styles.barFilled}` : styles.bar}
                    style={{ height }}
                  />
                  {showValues && (
                    <span className={styles.value} style={{ bottom: height }}>
                      {formatNumber(item.value)}
                    </span>
                  )}
                  <span className={tooltipClass(index, rows.length)} style={{ bottom: height }}>
                    {item.tooltip || item.label}: <strong>{formatNumber(item.value)}</strong>
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.xAxis}>
          {rows.map((item, index) => (
            <span key={item.key} className={xTickClass(index, rows.length, dense)}>
              {item.label}
            </span>
          ))}
        </div>

        {xLabel && <p className={styles.xLabel}>{xLabel}</p>}
      </div>

      <table className={styles.srOnly}>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{xLabel || 'Mục'}</th>
            <th scope="col">{yLabel || 'Giá trị'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.key}>
              <th scope="row">{item.tooltip || item.label}</th>
              <td>{formatNumber(item.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export default BarChart
