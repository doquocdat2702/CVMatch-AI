// Đọc nội dung JD dạng chữ thuần (HR nhập trong ô Mô tả) để trình bày rõ hơn (T35f).
// Không đổi dữ liệu: chỉ nhận ra tiêu đề phần, gạch đầu dòng và đoạn văn để hiển thị.

// Dòng bắt đầu bằng một trong các cụm này (không phân biệt hoa thường) và đủ ngắn thì là tiêu đề phần
const HEADING_WORDS = [
  'mô tả',
  'nhiệm vụ',
  'công việc',
  'trách nhiệm',
  'yêu cầu',
  'ưu tiên',
  'quyền lợi',
  'phúc lợi',
  'chế độ',
  'thu nhập',
  'mức lương',
  'địa điểm',
  'thời gian làm việc',
  'cách thức ứng tuyển',
  'hồ sơ',
  'thông tin',
]

// Tiêu đề phần là một dòng ngắn: dài hơn thế thường là một câu mô tả có chữ "yêu cầu", "công việc"...
const MAX_HEADING_LENGTH = 60

// Gạch đầu dòng HR hay gõ: "- ", "• ", "+ ", "* ", "– "
const BULLET = /^[-•+*–]\s+/
// Số thứ tự đầu tiêu đề: "1. ", "II. ", "2) "
const NUMBERING = /^(\d+|[IVX]+)[.)]\s*/i

// "MÔ TẢ CÔNG VIỆC:" -> "Mô tả công việc". Giao diện không viết hoa toàn bộ (docs/design.md mục 4)
function toHeadingText(line) {
  const text = line.replace(NUMBERING, '').replace(/:\s*$/, '').trim()
  if (text === text.toLocaleUpperCase('vi') && text !== text.toLocaleLowerCase('vi')) {
    const lower = text.toLocaleLowerCase('vi')
    return lower.charAt(0).toLocaleUpperCase('vi') + lower.slice(1)
  }
  return text
}

function isHeading(line) {
  if (line.length > MAX_HEADING_LENGTH || BULLET.test(line)) return false
  // Kết thúc bằng dấu câu là một câu văn (vd "Mô tả công việc Kế toán tổng hợp."), không phải tiêu đề
  if (/[.!?;,]$/.test(line)) return false
  const text = line.replace(NUMBERING, '').toLocaleLowerCase('vi')
  if (HEADING_WORDS.some((word) => text.startsWith(word))) return true
  // Dòng ngắn kết thúc bằng dấu hai chấm cũng là tiêu đề, vd "Kỹ năng cần có:"
  return line.endsWith(':') && line.length <= MAX_HEADING_LENGTH
}

// "...\nMô tả công việc\n- A\n- B\n\nYêu cầu\n- C" ->
// [{ heading: 'Mô tả công việc', blocks: [{ type: 'list', items: ['A', 'B'] }] }, { heading: 'Yêu cầu', ... }]
// blocks: { type: 'list', items } (các dòng gạch đầu dòng liền nhau) hoặc { type: 'paragraph', text } (một dòng).
// Phần trước tiêu đề đầu tiên (hoặc cả JD khi không có tiêu đề nào) có heading null
export function parseJobDescription(description) {
  const sections = []
  let current = null

  function ensureSection() {
    if (!current) {
      current = { heading: null, blocks: [] }
      sections.push(current)
    }
    return current
  }

  for (const rawLine of String(description || '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    if (isHeading(line)) {
      current = { heading: toHeadingText(line), blocks: [] }
      sections.push(current)
      continue
    }

    const section = ensureSection()
    const last = section.blocks[section.blocks.length - 1]
    if (BULLET.test(line)) {
      const item = line.replace(BULLET, '')
      if (last && last.type === 'list') {
        last.items.push(item)
      } else {
        section.blocks.push({ type: 'list', items: [item] })
      }
    } else {
      section.blocks.push({ type: 'paragraph', text: line })
    }
  }

  // Bỏ tiêu đề không có nội dung (vd "Quyền lợi" để trống ở cuối JD)
  return sections.filter((section) => section.blocks.length > 0)
}

// Đủ dài cho 2 dòng của thẻ tin trên màn hình rộng nhất; phần thừa CSS cắt bằng "..." (line-clamp)
const SUMMARY_LENGTH = 240

// Tóm tắt cho thẻ tin: nội dung của phần đầu tiên (thường là Mô tả công việc), nối các dòng thành một đoạn
export function summarizeJobDescription(description) {
  const [first] = parseJobDescription(description)
  if (!first) return ''
  const lines = first.blocks.flatMap((block) => (block.type === 'list' ? block.items : [block.text]))
  // Thêm dấu chấm giữa các dòng chưa có dấu câu cuối để đoạn tóm tắt đọc liền mạch
  const text = lines.map((line) => (/[.!?;:]$/.test(line) ? line : `${line}.`)).join(' ')
  return text.length > SUMMARY_LENGTH ? text.slice(0, SUMMARY_LENGTH) : text
}
