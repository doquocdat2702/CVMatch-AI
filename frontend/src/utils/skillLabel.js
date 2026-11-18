// Hiển thị tên kỹ năng của hồ sơ (T35j, trang Hồ sơ). CHỈ đổi cách hiển thị, không sửa dữ liệu.
// Cùng ý với bước bỏ ngoặc của backend (normalizer.js: stripParentheses, F1): phần trong ngoặc ( ) hoặc [ ]
// thường là ghi chú trình độ ("cơ bản", "đang học", "ES6+") nên tách ra để hiện chữ nhỏ.

// "JavaScript (ES6+)" -> { base: 'JavaScript', note: 'ES6+' }; "Excel [nâng cao] (MOS)" -> note "nâng cao, MOS".
// Ngoặc chưa đóng thì phần sau dấu mở là ghi chú. Bỏ hết vẫn rỗng (cả tên nằm trong ngoặc) thì base là tên gốc
export function splitSkillName(rawName) {
  const text = String(rawName || '').trim()
  const notes = []
  const base = text
    .replace(/[([]([^()[\]]*)[)\]]?/g, (_, inner) => {
      if (inner.trim()) notes.push(inner.trim())
      return ' '
    })
    .replace(/\s+/g, ' ')
    .replace(/[\s,;:\-–]+$/, '')
    .trim()
  return { base: base || text, note: base ? notes.join(', ') : '' }
}

// Khóa so trùng: bỏ dấu, chữ thường, gộp khoảng trắng ("Kế toán  thuế" = "ke toan thue")
export function skillKey(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Mục kỹ năng của hồ sơ -> chip: nhãn là Skill.name nếu có skillId, không thì tên đã bỏ ngoặc; ghi chú là phần
// trong ngoặc của tên trong CV. Gộp các mục cùng Skill hoặc cùng tên đã chuẩn hóa thành MỘT chip, giữ mục
// đại diện theo thứ tự ưu tiên: đã xác nhận trước, rồi mục có skillId, rồi mục đứng trước.
//   skills: [{ id, rawName, skillId, skill: { name } | null, source, isConfirmed }]
//   trả về [{ key, label, note, source, isConfirmed, count }] theo thứ tự xuất hiện đầu tiên
export function groupProfileSkills(skills) {
  const groups = new Map()
  const rank = (item) => (item.isConfirmed ? 2 : 0) + (item.skillId ? 1 : 0)

  for (const item of skills || []) {
    const { base, note } = splitSkillName(item.rawName)
    const label = item.skill && item.skill.name ? item.skill.name : base
    const key = skillKey(label)
    const current = groups.get(key)
    if (!current) {
      groups.set(key, { key, label, note, source: item.source, isConfirmed: item.isConfirmed, rank: rank(item), count: 1 })
      continue
    }
    current.count += 1
    if (rank(item) > current.rank) {
      Object.assign(current, { label, note: note || current.note, source: item.source, isConfirmed: item.isConfirmed, rank: rank(item) })
    } else if (!current.note && note) {
      current.note = note
    }
  }
  return [...groups.values()]
}
