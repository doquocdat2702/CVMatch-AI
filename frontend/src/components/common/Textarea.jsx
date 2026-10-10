import { useId } from 'react'
import styles from './Textarea.module.css'

// Ô nhập nhiều dòng (mô tả công việc, nội dung JD...) có nhãn, gợi ý và lỗi.
// Các prop còn lại (name, value, onChange, maxLength...) chuyển thẳng xuống <textarea>
function Textarea({ label, id, rows = 4, error, hint, required = false, className = '', ...rest }) {
  const autoId = useId()
  const textareaId = id || autoId
  const hintId = hint ? `${textareaId}-hint` : undefined
  const errorId = error ? `${textareaId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {label && (
        <label className={styles.label} htmlFor={textareaId}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={error ? `${styles.textarea} ${styles.invalid}` : styles.textarea}
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

export default Textarea
