import { useEffect } from 'react'
import { APP_NAME } from '../utils/appConfig'

// Tiêu đề tab trình duyệt theo trang (T35f): "Kế toán tổng hợp | DMatch".
// title rỗng (vd trang chưa tải xong tin) thì chỉ hiện tên hệ thống.
// Rời trang thì trả về tên hệ thống, để trang chưa đặt tiêu đề riêng (HR, Admin) không giữ tiêu đề của trang trước
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
    return () => {
      document.title = APP_NAME
    }
  }, [title])
}
