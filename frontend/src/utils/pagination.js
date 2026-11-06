// Phân trang dùng chung (D1). Trang hiện tại nằm trên URL (?page=2): tải lại trang hoặc bấm Back vẫn đúng trang.
// Component Pagination tự ẩn khi chỉ có 1 trang.

// Số dòng mỗi trang của các bảng (D1)
export const PAGE_SIZE = 9

// Số thẻ mỗi trang của bảng tin việc làm và tab Gợi ý (T35f): lưới 2 cột, 5 hàng không lẻ thẻ
export const CARD_PAGE_SIZE = 10

// ?page= trên URL -> số trang (từ 1); thiếu hoặc sai thì trang 1
export function readPage(searchParams) {
  return Math.max(1, Math.floor(Number(searchParams.get('page'))) || 1)
}

// Bản sao tham số URL với trang mới, giữ nguyên các tham số khác (?jobId=, ?status=, ?view=...).
// Trang 1 thì bỏ hẳn ?page= cho gọn URL
export function withPage(searchParams, page) {
  const params = new URLSearchParams(searchParams)
  if (page > 1) {
    params.set('page', String(page))
  } else {
    params.delete('page')
  }
  return params
}

// Phân trang phía client cho API trả cả danh sách.
// Trang trên URL vượt quá số trang thật (vd vừa xóa bớt dữ liệu) thì hiện trang cuối
export function paginate(items, page, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  return { pageItems: items.slice(start, start + pageSize), page: currentPage, totalPages }
}
