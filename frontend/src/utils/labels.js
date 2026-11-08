// Nhãn tiếng Việt cho các enum hiển thị trên nhiều trang

// ApplicationStatus: cùng chữ với thông báo của backend (notification.service.js)
export const APPLICATION_STATUS_LABEL = {
  APPLIED: 'Đã ứng tuyển',
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
  PROCESSING: 'Đang phân tích',
  COMPLETED: 'Đã phân tích',
  FAILED: 'Phân tích lỗi',
}

// Nguồn của mục hồ sơ (source của CandidateSkill / Experience / Education, T35g):
// RULE do từ điển kỹ năng bóc, NLP do mô hình ngôn ngữ (Gemini) bóc ở chế độ hybrid, MANUAL do ứng viên tự nhập
export const PROFILE_SOURCE_LABEL = {
  RULE: 'Từ điển',
  NLP: 'AI',
  MANUAL: 'Tự nhập',
}
