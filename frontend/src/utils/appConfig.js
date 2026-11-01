// Tên hệ thống hiển thị trên Header, trang đăng nhập và trang chủ, đổi qua biến VITE_APP_NAME trong .env.
// <title> trong index.html đọc thẳng %VITE_APP_NAME% nên không có giá trị mặc định này.
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Tuyển dụng DMatch'

// Trang Liên hệ: email và số điện thoại của bộ phận tuyển dụng, đổi qua .env. Để trống thì trang ẩn dòng đó
export const CONTACT_EMAIL = (import.meta.env.VITE_CONTACT_EMAIL || '').trim()
export const CONTACT_PHONE = (import.meta.env.VITE_CONTACT_PHONE || '').trim()

// Link mạng xã hội ở footer (T35e), địa chỉ đầy đủ https://. Để trống thì footer ẩn link đó
export const FACEBOOK_URL = (import.meta.env.VITE_FACEBOOK_URL || '').trim()
export const YOUTUBE_URL = (import.meta.env.VITE_YOUTUBE_URL || '').trim()
