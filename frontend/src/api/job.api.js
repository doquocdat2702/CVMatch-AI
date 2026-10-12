import axiosClient from './axiosClient'

// Chi tiết một tin tuyển dụng (API công khai): tiêu đề, mô tả JD, địa điểm, công ty, trạng thái mở / đóng
export async function getJobDetail(id) {
  const response = await axiosClient.get(`/jobs/${id}`)
  return response.data
}
