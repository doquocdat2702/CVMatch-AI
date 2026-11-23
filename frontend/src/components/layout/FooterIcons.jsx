import styles from './FooterIcons.module.css'

// 3 icon chức năng của footer (T35e, ngoại lệ đã duyệt): SVG viết tay, chỉ nét, màu theo chữ (currentColor),
// 16px. Chỉ để trang trí cạnh dòng chữ nên luôn aria-hidden; nhãn đọc cho trình đọc màn hình nằm ở dòng chữ.
// Không dùng thư viện icon.
// T35m: thêm CodeIcon (dòng GitHub) và ProfileCardIcon (dòng LinkedIn) cho cột Liên hệ của mẫu CV Chuyên nghiệp, cùng
// cách vẽ. Cố ý KHÔNG vẽ logo thương hiệu: chỉ là dấu mã nguồn </> và thẻ hồ sơ

export function LocationIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  )
}

export function PhoneIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  )
}

export function MailIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}

// Dấu mã nguồn: hai ngoặc nhọn và một gạch chéo
export function CodeIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 7l-5 5 5 5" />
      <path d="M16 7l5 5-5 5" />
      <path d="M14 4l-4 16" />
    </svg>
  )
}

// Thẻ hồ sơ: khung thẻ, đầu và vai người, hai dòng chữ
export function ProfileCardIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16a3 3 0 0 1 6 0" />
      <path d="M15 10h3M15 14h3" />
    </svg>
  )
}
