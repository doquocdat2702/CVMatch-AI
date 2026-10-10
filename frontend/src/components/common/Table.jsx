import styles from './Table.module.css'

const ALIGN_CLASS = { right: styles.alignRight, center: styles.alignCenter }

// columns: [{ key, title, align: 'left' | 'right' | 'center', render: (row, index) => nội dung ô }]
//   không có render thì hiện row[key]; cột số, cột thao tác dùng align 'right'
// data: mảng bản ghi; rowKey: tên trường làm key của hàng (mặc định 'id')
function Table({ columns, data, rowKey = 'id', emptyText = 'Chưa có dữ liệu' }) {
  const rows = data || []

  return (
    // Bảng rộng hơn màn hình thì cuộn ngang trong khung, không cuộn cả trang
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={ALIGN_CLASS[column.align]}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className={styles.empty} colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row[rowKey] ?? index}>
                {columns.map((column) => (
                  <td key={column.key} className={ALIGN_CLASS[column.align]}>
                    {column.render ? column.render(row, index) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Table
