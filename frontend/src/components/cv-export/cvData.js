// Phần ĐỔ DỮ LIỆU của CV, tách khỏi phần hiển thị (2 template).
// Hàm thuần: không dùng React, không dùng trình duyệt, không gọi API. Template chỉ đọc kết quả
// buildCVData, nên sau này backend có thể dùng lại cùng hàm và cùng template để sinh CV.
import { formatMonthYear } from '../../utils/format'

function formatPeriod(startDate, endDate) {
  const start = formatMonthYear(startDate)
  const end = formatMonthYear(endDate)
  if (start && end) return `${start} - ${end}`
  if (start) return `Từ ${start}`
  if (end) return `Đến ${end}`
  return ''
}

// Kinh nghiệm / học vấn gần nhất lên trước như CV thông thường; mục không có ngày xếp cuối
function byStartDateDesc(a, b) {
  if (!a.startDate && !b.startDate) return 0
  if (!a.startDate) return 1
  if (!b.startDate) return -1
  return new Date(b.startDate) - new Date(a.startDate)
}

// Bỏ kỹ năng trùng tên (vd RULE và NLP cùng bóc ra "React"), giữ đúng chữ người dùng thấy ở trang ParsedCV
function uniqueSkillNames(skills) {
  const seen = new Set()
  const names = []
  for (const skill of skills) {
    const name = (skill.rawName || '').trim()
    const key = name.toLowerCase()
    if (name && !seen.has(key)) {
      seen.add(key)
      names.push(name)
    }
  }
  return names
}

// profile: dữ liệu GET /candidates/me kèm email của tài khoản (API hồ sơ không có email).
// Giữ cả mục chưa xác nhận, không lọc bỏ.
export function buildCVData(profile) {
  const contacts = [
    { label: 'Email', value: profile.email },
    { label: 'Điện thoại', value: profile.phone },
    { label: 'Địa chỉ', value: profile.address },
  ].filter((contact) => contact.value)

  const experiences = [...(profile.experiences || [])].sort(byStartDateDesc).map((experience) => ({
    id: experience.id,
    position: experience.position,
    companyName: experience.companyName,
    period: formatPeriod(experience.startDate, experience.endDate),
    description: experience.description || '',
  }))

  const educations = [...(profile.educations || [])].sort(byStartDateDesc).map((education) => ({
    id: education.id,
    school: education.school,
    detail: [education.degree, education.major].filter(Boolean).join(', '),
    period: formatPeriod(education.startDate, education.endDate),
  }))

  return {
    fullName: profile.fullName || '',
    headline: profile.headline || '',
    contacts,
    skills: uniqueSkillNames(profile.skills || []),
    experiences,
    educations,
  }
}

// Hồ sơ còn mục do hệ thống phân tích mà người dùng chưa xác nhận
export function hasUnconfirmedItems(profile) {
  return ['skills', 'experiences', 'educations'].some((key) =>
    (profile[key] || []).some((item) => !item.isConfirmed),
  )
}
