import axiosClient from './axiosClient'

// Hệ thống phục vụ một công ty: nhà tuyển dụng xem và sửa công ty của mình qua /companies/me

export async function getMyCompany() {
  const response = await axiosClient.get('/companies/me')
  return response.data
}

// { name, description, address, website }: name bắt buộc, các trường còn lại để trống thì xóa
export async function updateMyCompany(payload) {
  const response = await axiosClient.put('/companies/me', payload)
  return response.data
}
