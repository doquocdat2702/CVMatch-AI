import { useId } from 'react'
import styles from './Select.module.css'

// Ô chọn có nhãn, gợi ý và lỗi.
// options: [{ value, label }]; placeholder: dòng đầu rỗng (vd "Chọn trạng thái"), bỏ trống thì không có.
// Các prop còn lại (name, value, onChange...) chuyển thẳng xuống <select>
function Select({ label, id, options = [], placeholder, error, hint, required = false, className = '', ...rest }) {
  const autoId = useId()
  const selectId = id || autoId
  const hintId = hint ? `${selectId}-hint` : undefined
  const errorId = error ? `${selectId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {label && (
        <label className={styles.label} htmlFor={selectId}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      <select
        id={selectId}
        className={error ? `${styles.select} ${styles.invalid}` : styles.select}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}

export default Select
