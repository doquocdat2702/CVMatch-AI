import { useEffect, useState } from 'react'
import { getPublicCompany } from '../../api/company.api'
import Loading from '../../components/common/Loading'
import { CONTACT_EMAIL, CONTACT_PHONE } from '../../utils/appConfig'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import styles from './Contact.module.css'

// tel: chỉ nhận chữ số và dấu +, bỏ khoảng trắng, dấu chấm hay gạch ngang trong số hiển thị
function toTelHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

// Trang Liên hệ "/contact" (công khai): email và số điện thoại lấy từ .env (VITE_CONTACT_EMAIL,
// VITE_CONTACT_PHONE), địa chỉ lấy từ công ty. Dòng nào trống thì ẩn. Không có form liên hệ, không gửi mail
function Contact() {
  useDocumentTitle('Liên hệ')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    getPublicCompany()
      .then((result) => {
        if (!ignore) setAddress((result.data.address || '').trim())
      })
      .catch(() => {
        // Không tải được công ty thì chỉ ẩn dòng địa chỉ, email và số điện thoại vẫn hiện
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  const rows = []
  if (CONTACT_EMAIL) {
    rows.push({
      label: 'Email',
      value: (
        <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      ),
    })
  }
  if (CONTACT_PHONE) {
    rows.push({
      label: 'Điện thoại',
      value: (
        <a className={styles.link} href={toTelHref(CONTACT_PHONE)}>
          {CONTACT_PHONE}
        </a>
      ),
    })
  }
  if (address) {
    rows.push({ label: 'Địa chỉ', value: address })
  }

  let content
  if (loading) {
    content = <Loading text="Đang tải thông tin liên hệ..." />
  } else if (rows.length === 0) {
    content = <p className={styles.empty}>Hiện chưa có thông tin liên hệ.</p>
  } else {
    content = (
      <dl className={styles.details}>
        {rows.map((row) => (
          <div key={row.label}>
            <dt className={styles.term}>{row.label}</dt>
            <dd className={styles.value}>{row.value}</dd>
          </div>
        ))}
      </dl>
    )
  }

  return (
    <>
      <h1>Liên hệ</h1>
      <p className={styles.intro}>Bộ phận tuyển dụng hỗ trợ các câu hỏi về tin tuyển dụng và đơn ứng tuyển.</p>
      {content}
    </>
  )
}

export default Contact
