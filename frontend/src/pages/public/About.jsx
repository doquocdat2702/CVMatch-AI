import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicCompany } from '../../api/company.api'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import { getErrorMessage } from '../../utils/apiError'
import styles from './About.module.css'

// Website lưu tự do: chỉ biến thành link khi bắt đầu bằng http(s), tránh link lạ như "javascript:"
// (cùng quy tắc với trang Công ty của nhà tuyển dụng)
function isWebLink(value) {
  return /^https?:\/\//i.test(value)
}

// Trang Giới thiệu "/about" (công khai): thông tin công ty duy nhất, chỉ các trường có trong bảng Company.
// Trường trống thì ẩn cả dòng
function About() {
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    getPublicCompany()
      .then((result) => {
        if (!ignore) setCompany(result.data)
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, 'Không tải được thông tin công ty'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [reloadKey])

  function handleRetry() {
    setError('')
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  if (loading) {
    return <Loading text="Đang tải thông tin công ty..." />
  }

  if (error) {
    return (
      <>
        <h1>Giới thiệu</h1>
        <p className={styles.alertError} role="alert">
          {error}
        </p>
        <Button variant="secondary" onClick={handleRetry}>
          Thử lại
        </Button>
      </>
    )
  }

  const description = (company.description || '').trim()
  const address = (company.address || '').trim()
  const website = (company.website || '').trim()

  return (
    <>
      <h1>Giới thiệu</h1>
      <section className={styles.company}>
        <h2 className={styles.name}>{company.name}</h2>
        {description && <p className={styles.description}>{description}</p>}

        {(address || website) && (
          <dl className={styles.details}>
            {address && (
              <div>
                <dt className={styles.term}>Địa chỉ</dt>
                <dd className={styles.value}>{address}</dd>
              </div>
            )}
            {website && (
              <div>
                <dt className={styles.term}>Website</dt>
                <dd className={styles.value}>
                  {isWebLink(website) ? (
                    <a className={styles.link} href={website} target="_blank" rel="noopener noreferrer">
                      {website}
                    </a>
                  ) : (
                    website
                  )}
                </dd>
              </div>
            )}
          </dl>
        )}
      </section>

      <Link className={styles.cta} to="/">
        Xem các vị trí đang tuyển
      </Link>
    </>
  )
}

export default About
