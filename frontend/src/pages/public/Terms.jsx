import { Link } from 'react-router-dom'
import { usePublicCompany } from '../../hooks/usePublicCompany'
import { APP_NAME } from '../../utils/appConfig'
import { formatDate } from '../../utils/format'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import styles from './Legal.module.css'

// Ngày cập nhật nội dung trang, sửa tay mỗi khi đổi nội dung (giờ địa phương, không có "Z" để không lệch ngày)
const LAST_UPDATED = '2026-10-31T00:00:00'

// Trang Điều khoản sử dụng "/terms" (công khai, T35e). Nội dung tĩnh, chỉ nêu đúng những gì hệ thống đang làm.
// Câu có đánh dấu "CẦN CHỦ DỰ ÁN DUYỆT" là cam kết của công ty mà code không kiểm chứng được
function Terms() {
  useDocumentTitle('Điều khoản sử dụng')
  const company = usePublicCompany()
  const companyName = (company && company.name) || APP_NAME

  return (
    <article className={styles.page}>
      <h1>Điều khoản sử dụng</h1>
      <p className={styles.lead}>
        Khi tạo tài khoản và sử dụng hệ thống tuyển dụng của {companyName}, bạn đồng ý với các điều khoản dưới đây.
      </p>

      <section className={styles.section}>
        <h2>1. Phạm vi sử dụng</h2>
        <p>
          Hệ thống phục vụ hoạt động tuyển dụng của {companyName}. Ứng viên dùng hệ thống để xem tin tuyển dụng, tạo hồ
          sơ, tải CV và ứng tuyển. Tài khoản nhà tuyển dụng do quản trị viên của công ty cấp. Không dùng hệ thống
          cho mục đích khác.
        </p>
      </section>

      <section className={styles.section}>
        <h2>2. Tài khoản và thông tin bạn cung cấp</h2>
        <ul className={styles.list}>
          <li>Thông tin trong hồ sơ, CV và đơn ứng tuyển phải đúng sự thật và là của chính bạn.</li>
          <li>Không mạo danh người khác hoặc dùng thông tin của người khác để tạo tài khoản.</li>
          <li>Bạn tự giữ bí mật mật khẩu của mình.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>3. File tải lên</h2>
        <p>
          Hệ thống chỉ nhận CV dạng PDF hoặc DOCX, tối đa 5 MB, và từ chối file không đúng định dạng. Không tải lên file chứa
          mã độc, file giả mạo hoặc tài liệu không phải CV của bạn.
        </p>
      </section>

      <section className={styles.section}>
        <h2>4. Khóa tài khoản</h2>
        <p>
          {companyName} có quyền khóa tài khoản vi phạm các điều khoản này. Tài khoản bị khóa không đăng nhập được cho
          tới khi được mở khóa.
        </p>
      </section>

      <section className={styles.section}>
        <h2>5. Kết quả phân tích và đối chiếu</h2>
        <p>
          Hệ thống dùng quy tắc và AI để đọc nội dung CV và đối chiếu hồ sơ với yêu cầu của từng vị trí. Kết quả đọc CV
          có thể chưa chính xác, bạn nên kiểm tra và sửa lại hồ sơ. Kết quả đối chiếu chỉ mang tính tham khảo: đó
          là số yêu cầu có bằng chứng trong hồ sơ, không phải điểm năng lực, và không quyết định việc tuyển dụng. Xem
          thêm cách dữ liệu được xử lý ở trang{' '}
          <Link className={styles.link} to="/privacy">
            Chính sách bảo mật
          </Link>
          .
        </p>
      </section>

      <section className={styles.section}>
        <h2>6. Thay đổi điều khoản</h2>
        {/* CẦN CHỦ DỰ ÁN DUYỆT */}
        <p>
          {companyName} có thể cập nhật các điều khoản này; ngày cập nhật ghi ở cuối trang. Tiếp tục sử dụng hệ thống sau
          khi điều khoản thay đổi nghĩa là bạn đồng ý với nội dung mới.
        </p>
      </section>

      <section className={styles.section}>
        <h2>7. Liên hệ</h2>
        <p>
          Câu hỏi về điều khoản xin gửi tới bộ phận tuyển dụng qua trang{' '}
          <Link className={styles.link} to="/contact">
            Liên hệ
          </Link>
          .
        </p>
      </section>

      <p className={styles.updated}>Cập nhật lần cuối: {formatDate(LAST_UPDATED)}</p>
    </article>
  )
}

export default Terms
