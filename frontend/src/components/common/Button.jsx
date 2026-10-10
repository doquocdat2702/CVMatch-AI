import styles from './Button.module.css'

// variant: primary | secondary | danger | ghost; size: md (40px) | sm (32px, dùng trong bảng)
// loading: khóa nút trong lúc gửi, trang tự đổi chữ (vd "Đang lưu...")
// Các prop còn lại (onClick, form, aria-*...) chuyển thẳng xuống <button>
function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [styles.button, styles[variant], size === 'sm' ? styles.sm : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {children}
    </button>
  )
}

export default Button
