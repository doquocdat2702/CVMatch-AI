// Tên hệ thống hiển thị trên Header, trang đăng nhập và trang chủ, đổi qua biến VITE_APP_NAME trong .env.
// <title> trong index.html đọc thẳng %VITE_APP_NAME% nên không có giá trị mặc định này.
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Tuyển dụng DMatch'
