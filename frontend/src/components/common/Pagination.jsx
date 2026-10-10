import styles from './Pagination.module.css'

// Danh sách nút cần hiện: trang đầu, trang cuối, trang hiện tại và 1 trang mỗi bên.
// Chỗ bị bỏ qua thay bằng 'gap' (hiện dấu ...), nếu chỉ thiếu đúng 1 trang thì hiện luôn trang đó.
function getPageItems(page, totalPages) {
  const candidates = [1, page - 1, page, page + 1, totalPages]
  const pages = [...new Set(candidates)].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)

  const items = []
  pages.forEach((p, index) => {
    const previous = pages[index - 1]
    if (previous !== undefined && p - previous === 2) items.push(previous + 1)
    if (previous !== undefined && p - previous > 2) items.push('gap')
    items.push(p)
  })
  return items
}

// page: trang hiện tại (bắt đầu từ 1); totalPages: lấy từ pagination.totalPages của API.
// onChange(trang mới). Chỉ có 1 trang thì không hiện gì.
function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null

  const items = getPageItems(page, totalPages)

  return (
    <nav className={styles.pagination} aria-label="Phân trang">
      <button type="button" className={styles.item} onClick={() => onChange(page - 1)} disabled={page <= 1}>
        Trước
      </button>

      {items.map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className={styles.gap} aria-hidden="true">
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={item === page ? `${styles.item} ${styles.current}` : styles.item}
            aria-label={`Trang ${item}`}
            aria-current={item === page ? 'page' : undefined}
            onClick={() => {
              if (item !== page) onChange(item)
            }}
          >
            {item}
          </button>
        ),
      )}

      <button type="button" className={styles.item} onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Sau
      </button>
    </nav>
  )
}

export default Pagination
