import { Link } from 'react-router-dom'
import { usePublicCompany } from '../../hooks/usePublicCompany'
import { APP_NAME, CONTACT_EMAIL } from '../../utils/appConfig'
import { formatDate } from '../../utils/format'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import styles from './Legal.module.css'

// Ngày cập nhật nội dung trang, sửa tay mỗi khi đổi nội dung (giờ địa phương, không có "Z" để không lệch ngày)
const LAST_UPDATED = '2026-10-31T00:00:00'

// Trang Chính sách bảo mật "/privacy" (công khai, T35e). Nội dung tĩnh, chỉ mô tả đúng những gì hệ thống đang làm.
// Câu có đánh dấu "CẦN CHỦ DỰ ÁN DUYỆT" là cam kết của công ty mà code không kiểm chứng được
function Privacy() {
  useDocumentTitle('Chính sách bảo mật')
  const company = usePublicCompany()
  const companyName = (company && company.name) || APP_NAME

  return (
    <article className={styles.page}>
      <h1>Chính sách bảo mật</h1>
      <p className={styles.lead}>
        Trang này giải thích {companyName} thu thập, sử dụng và bảo vệ dữ liệu của bạn như thế nào khi bạn dùng hệ thống
        tuyển dụng này.
      </p>

      <section className={styles.section}>
        <h2>1. Dữ liệu chúng tôi thu thập</h2>
        <ul className={styles.list}>
          <li>
            Thông tin tài khoản: email, mật khẩu, họ tên; số điện thoại, địa chỉ và tiêu đề hồ sơ nếu bạn tự nhập.
          </li>
          <li>CV bạn tải lên (tệp PDF hoặc DOCX).</li>
          <li>
            Nội dung bóc tách từ CV: văn bản trích ra từ tệp và các mục kỹ năng, kinh nghiệm, học vấn được lưu vào hồ sơ
            của bạn.
          </li>
          <li>Đơn ứng tuyển: vị trí bạn ứng tuyển, thời điểm nộp, trạng thái xử lý và thông báo liên quan.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>2. Mục đích sử dụng</h2>
        <p>
          Dữ liệu chỉ phục vụ hoạt động tuyển dụng của {companyName}: xem xét đơn ứng tuyển, đối chiếu hồ sơ với yêu cầu
          của từng vị trí, gợi ý việc làm cho bạn và báo cho bạn khi đơn đổi trạng thái. Email còn dùng để đăng nhập và
          gửi liên kết đặt lại mật khẩu khi bạn yêu cầu.
        </p>
        {/* CẦN CHỦ DỰ ÁN DUYỆT */}
        <p>{companyName} không bán dữ liệu của bạn và không chia sẻ cho bên thứ ba để quảng cáo.</p>
      </section>

      <section className={styles.section}>
        <h2>3. Sử dụng AI để phân tích CV</h2>
        <p>
          Khi bạn phân tích CV, nội dung văn bản trích từ CV có thể được gửi tới dịch vụ AI Gemini của Google để bóc tách
          kỹ năng, kinh nghiệm và học vấn. Tệp CV gốc không được gửi đi.
        </p>
        {/* CẦN CHỦ DỰ ÁN DUYỆT */}
        <p>Việc xử lý dữ liệu tại dịch vụ AI tuân theo điều khoản của nhà cung cấp dịch vụ.</p>
        <p>
          AI chỉ hỗ trợ phân tích và đối chiếu, không quyết định tuyển dụng. Kết quả đối chiếu cho biết bao nhiêu yêu cầu
          của vị trí có bằng chứng trong hồ sơ, đây là chỉ số tham khảo, không phải điểm đánh giá năng lực. Mọi quyết
          định tuyển dụng do nhân viên tuyển dụng của công ty đưa ra.
        </p>
      </section>

      <section className={styles.section}>
        <h2>4. Ai được xem dữ liệu của bạn</h2>
        <ul className={styles.list}>
          <li>
            Nhân viên tuyển dụng của {companyName} (tài khoản do quản trị viên cấp): xem đơn ứng tuyển và hồ sơ đã phân
            tích của bạn. Hồ sơ có CV đã phân tích có thể xuất hiện trong danh sách ứng viên gợi ý của các vị trí đang
            tuyển, kể cả vị trí bạn chưa ứng tuyển.
          </li>
          <li>Quản trị viên hệ thống: quản lý tài khoản (email, vai trò, trạng thái hoạt động).</li>
          <li>Ứng viên khác không xem được hồ sơ, CV hay đơn ứng tuyển của bạn.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>5. Bảo vệ dữ liệu</h2>
        <ul className={styles.list}>
          <li>Mật khẩu được lưu dưới dạng đã băm, không ai đọc được mật khẩu gốc, kể cả quản trị viên.</li>
          <li>
            Tệp CV được lưu với tên ngẫu nhiên và không công khai trên web; chỉ bạn mở được danh sách CV của mình sau khi
            đăng nhập.
          </li>
          <li>Đăng nhập sai nhiều lần liên tiếp sẽ bị tạm chặn; phiên đăng nhập có thời hạn.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>6. Quyền của bạn</h2>
        <ul className={styles.list}>
          <li>Xem và sửa thông tin hồ sơ, kỹ năng, kinh nghiệm, học vấn bất cứ lúc nào.</li>
          <li>
            Xóa CV đã tải lên trong mục CV của tôi: tệp và bản ghi CV bị xóa; các mục kỹ năng, kinh nghiệm, học vấn đã
            lưu vào hồ sơ vẫn giữ, bạn tự xóa từng mục nếu muốn.
          </li>
          <li>Rút đơn ứng tuyển khi nhà tuyển dụng chưa bắt đầu xem xét đơn.</li>
          <li>Đổi mật khẩu trong mục Đổi mật khẩu.</li>
          {/* CẦN CHỦ DỰ ÁN DUYỆT */}
          <li>Với yêu cầu khác về dữ liệu cá nhân (ví dụ khóa hoặc xóa tài khoản), vui lòng liên hệ công ty.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>7. Liên hệ</h2>
        <p>
          Câu hỏi về dữ liệu cá nhân xin gửi tới bộ phận tuyển dụng
          {CONTACT_EMAIL && (
            <>
              {' '}
              qua email{' '}
              <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
            </>
          )}{' '}
          hoặc xem thêm ở trang{' '}
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

export default Privacy
