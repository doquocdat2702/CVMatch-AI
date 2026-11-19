// Mã số lớn nhất của cột Int (MySQL INT có dấu). Mã lớn hơn coi như không hợp lệ (QA-08),
// không đưa xuống Prisma vì Prisma báo lỗi kiểu dữ liệu -> 500
const MAX_DB_ID = 2147483647;

// Số dòng tối đa mỗi trang của các API có phân trang (QA-06), bằng trần của API gợi ý
const MAX_PAGE_SIZE = 50;

module.exports = { MAX_DB_ID, MAX_PAGE_SIZE };
