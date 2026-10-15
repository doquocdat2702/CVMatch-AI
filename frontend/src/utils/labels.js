// Nhãn tiếng Việt cho các enum hiển thị trên nhiều trang

// ApplicationStatus: cùng chữ với thông báo của backend (notification.service.js)
export const APPLICATION_STATUS_LABEL = {
  APPLIED: 'Đã nộp',
  REVIEWING: 'Đang xem xét',
  ACCEPTED: 'Đã chấp nhận',
  REJECTED: 'Đã từ chối',
}

// MatchStatus: kết quả đối chiếu một yêu cầu
export const MATCH_STATUS_LABEL = {
  SUPPORTED: 'Có bằng chứng',
  UNCERTAIN: 'Chưa chắc chắn',
  NOT_FOUND: 'Không tìm thấy',
}

// RequirementType
export const REQUIREMENT_TYPE_LABEL = {
  REQUIRED: 'Bắt buộc',
  PREFERRED: 'Ưu tiên',
  OPTIONAL: 'Không bắt buộc',
}

// CvStatus: cùng chữ với trang CV của tôi (CVUpload)
export const CV_STATUS_LABEL = {
  UPLOADED: 'Chưa phân tích',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Đã phân tích',
  FAILED: 'Lỗi',
}
