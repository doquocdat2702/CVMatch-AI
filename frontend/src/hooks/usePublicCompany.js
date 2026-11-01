import { useEffect, useState } from 'react'
import { getPublicCompany } from '../api/company.api'

// Thông tin công khai của công ty duy nhất { name, description, address, website } cho footer,
// Chính sách bảo mật, Điều khoản. getPublicCompany đã giữ kết quả trong bộ nhớ nên đổi trang không gọi lại API.
// Trả về null khi đang tải hoặc lỗi: nơi dùng tự thay bằng tên hệ thống và ẩn các dòng thiếu dữ liệu
export function usePublicCompany() {
  const [company, setCompany] = useState(null)

  useEffect(() => {
    let ignore = false
    getPublicCompany()
      .then((result) => {
        if (!ignore) setCompany(result.data)
      })
      .catch(() => {
        // Giữ null: footer vẫn hiện Logo, link và thanh dưới với tên hệ thống
      })
    return () => {
      ignore = true
    }
  }, [])

  return company
}
