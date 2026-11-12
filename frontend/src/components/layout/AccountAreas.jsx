import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getMyProfile } from '../../api/candidate.api'
import { getMyRecruiterProfile } from '../../api/recruiter.api'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABEL, ROLES } from '../../utils/roles'
import AccountLayout from './AccountLayout'

// Khu "Tài khoản" của từng role (T35i): mỗi khung tải dữ liệu thẻ tóm tắt rồi giao cho AccountLayout trình bày.
// Trang con gọi refreshProfile (qua useOutletContext) sau khi lưu hồ sơ để thẻ tóm tắt cập nhật ngay.

// Đếm số mục hồ sơ đã có: chuỗi phải khác rỗng, các giá trị khác chỉ cần đúng
function countFilled(profile, parts) {
  return parts.filter((isFilled) => {
    const value = isFilled(profile)
    return typeof value === 'string' ? value.trim() !== '' : Boolean(value)
  }).length
}

// Tải lại hồ sơ khi đổi trang trong khu (vd vừa phân tích CV xong rồi sang Hồ sơ) hoặc khi trang con báo.
// Lỗi thì thẻ tóm tắt chỉ có tên và email, nội dung trang vẫn dùng được
function useAccountProfile(loadProfile) {
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    loadProfile()
      .then((result) => {
        if (!ignore) setProfile(result.data)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [loadProfile, location.pathname, reloadKey])

  // Giữ cùng một object giữa các lần render để trang con không chạy lại effect phụ thuộc vào nó
  const outletContext = useMemo(() => ({ refreshProfile: () => setReloadKey((key) => key + 1) }), [])
  return { profile, outletContext }
}

// ===== Ứng viên (T35g) =====

const CANDIDATE_ITEMS = [
  { to: '/candidate/profile', label: 'Hồ sơ' },
  { to: '/candidate/cvs', label: 'CV của tôi' },
  { to: '/candidate/applications', label: 'Đơn ứng tuyển' },
  { to: '/candidate/change-password', label: 'Đổi mật khẩu' },
]

// "Hồ sơ đã có x/7 mục": 4 trường ứng viên tự nhập + 3 nhóm dữ liệu từ CV
const CANDIDATE_PARTS = [
  (profile) => profile.fullName,
  (profile) => profile.phone,
  (profile) => profile.address,
  (profile) => profile.headline,
  (profile) => profile.skills && profile.skills.length > 0,
  (profile) => profile.experiences && profile.experiences.length > 0,
  (profile) => profile.educations && profile.educations.length > 0,
]

// API không trả ngày tạo tài khoản cho ứng viên nên không có dòng "Tham gia"
export function CandidateAccountLayout() {
  const { user, profileName } = useAuth()
  const { profile, outletContext } = useAccountProfile(getMyProfile)

  const summary = {
    fullName: (profile && profile.fullName) || profileName || '',
    email: user ? user.email : '',
    badge: null,
    meta: null,
    progress: profile ? { filled: countFilled(profile, CANDIDATE_PARTS), total: CANDIDATE_PARTS.length } : null,
  }

  return (
    <AccountLayout
      items={CANDIDATE_ITEMS}
      navLabel="Tài khoản của tôi"
      summary={summary}
      outletContext={outletContext}
    />
  )
}

// ===== Nhà tuyển dụng (T35i) =====

const RECRUITER_ITEMS = [
  { to: '/recruiter/profile', label: 'Hồ sơ' },
  { to: '/recruiter/company', label: 'Thông tin công ty' },
  { to: '/recruiter/change-password', label: 'Đổi mật khẩu' },
]

// "Hồ sơ đã có x/3 mục": đúng 3 trường nhà tuyển dụng tự sửa (PUT /recruiters/me). Công ty do hệ thống gán, không tính
const RECRUITER_PARTS = [(profile) => profile.fullName, (profile) => profile.phone, (profile) => profile.position]

export function RecruiterAccountLayout() {
  const { user } = useAuth()
  const { profile, outletContext } = useAccountProfile(getMyRecruiterProfile)

  const summary = {
    fullName: (profile && profile.fullName) || '',
    email: user ? user.email : '',
    badge: { status: ROLES.RECRUITER, label: ROLE_LABEL[ROLES.RECRUITER] },
    meta: profile && profile.company ? profile.company.name : null,
    progress: profile ? { filled: countFilled(profile, RECRUITER_PARTS), total: RECRUITER_PARTS.length } : null,
  }

  return (
    <AccountLayout items={RECRUITER_ITEMS} navLabel="Tài khoản" summary={summary} outletContext={outletContext} />
  )
}

// ===== Quản trị viên (T35i) =====

const ADMIN_ITEMS = [
  { to: '/admin/profile', label: 'Hồ sơ' },
  { to: '/admin/change-password', label: 'Đổi mật khẩu' },
]

// Quản trị viên không có bảng hồ sơ: thẻ tóm tắt lấy email từ phiên đăng nhập, không có dòng x/y mục
export function AdminAccountLayout() {
  const { user } = useAuth()

  const summary = {
    fullName: '',
    email: user ? user.email : '',
    badge: { status: ROLES.ADMIN, label: ROLE_LABEL[ROLES.ADMIN] },
    meta: null,
    progress: null,
  }

  return <AccountLayout items={ADMIN_ITEMS} navLabel="Tài khoản" summary={summary} />
}
