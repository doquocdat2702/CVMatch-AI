// Tên role trùng với bảng Role ở backend
export const ROLES = {
  ADMIN: 'ADMIN',
  RECRUITER: 'RECRUITER',
  CANDIDATE: 'CANDIDATE',
}

// Trang chính của từng role, dùng để điều hướng sau khi đăng nhập
const ROLE_HOME = {
  ADMIN: '/admin',
  RECRUITER: '/recruiter',
  CANDIDATE: '/candidate',
}

export const ROLE_LABEL = {
  ADMIN: 'Quản trị viên',
  RECRUITER: 'Nhà tuyển dụng',
  CANDIDATE: 'Ứng viên',
}

export function getRoleHome(role) {
  return ROLE_HOME[role] || '/'
}
