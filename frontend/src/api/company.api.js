import axiosClient from './axiosClient'

// Hệ thống phục vụ một công ty: nhà tuyển dụng xem và sửa công ty của mình qua /companies/me

export async function getMyCompany() {
  const response = await axiosClient.get('/companies/me')
  return response.data
}

// { description, address, website }: để trống thì xóa. Tên công ty cố định theo COMPANY_NAME (G7),
// backend bỏ qua name nếu có gửi
export async function updateMyCompany(payload) {
  const response = await axiosClient.put('/companies/me', payload)
  // Thông tin công ty vừa đổi: bỏ bản lưu của getPublicCompany để footer, Giới thiệu đọc lại bản mới
  publicCompanyRequest = null
  return response.data
}

// Kết quả GET /company/public giữ trong bộ nhớ của phiên (mất khi tải lại trang): footer, trang Giới thiệu,
// Liên hệ, Chính sách bảo mật, Điều khoản dùng chung một lần gọi, không gọi lại mỗi lần đổi trang.
// Giữ promise (không giữ dữ liệu) để các nơi gọi cùng lúc chỉ tạo một request
let publicCompanyRequest = null

// Công ty duy nhất, xem công khai không cần đăng nhập.
// data: { name, description, address, website }, trường chưa nhập là null.
// Lỗi thì bỏ bản lưu để lần sau (hoặc nút Thử lại) gọi lại
export function getPublicCompany() {
  if (!publicCompanyRequest) {
    publicCompanyRequest = axiosClient
      .get('/company/public')
      .then((response) => response.data)
      .catch((err) => {
        publicCompanyRequest = null
        throw err
      })
  }
  return publicCompanyRequest
}
