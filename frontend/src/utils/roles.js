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

// Đường dẫn nằm trong khu của role khác (vd /admin/... khi đăng nhập bằng ứng viên): quay lại đó chỉ ra /403,
// nên sau đăng nhập về trang chính của role thay vì quay lại (QA-03)
export function belongsToOtherRole(pathname, role) {
  return Object.entries(ROLE_HOME).some(
    ([otherRole, prefix]) => otherRole !== role && (pathname === prefix || pathname.startsWith(`${prefix}/`)),
  )
}
