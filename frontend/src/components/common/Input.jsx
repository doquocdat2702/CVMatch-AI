import { useId } from 'react'
import styles from './Input.module.css'

// Ô nhập một dòng có nhãn, gợi ý và lỗi.
// Các prop còn lại (name, type, value, onChange, autoComplete...) chuyển thẳng xuống <input>
function Input({ label, id, error, hint, required = false, className = '', ...rest }) {
  const autoId = useId()
  const inputId = id || autoId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  // Trình đọc màn hình đọc kèm gợi ý và lỗi khi người dùng vào ô
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      <input
        id={inputId}
        className={error ? `${styles.input} ${styles.invalid}` : styles.input}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
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

export default Input
