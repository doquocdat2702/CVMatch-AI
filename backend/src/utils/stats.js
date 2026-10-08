// Hỗ trợ thống kê theo ngày / tháng cho các trang Tổng quan.
// Gom theo giờ địa phương của server; ngày / tháng không có dữ liệu vẫn có mặt với count 0.

function pad(value) {
  return String(value).padStart(2, '0');
}

function dayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

// 0 giờ của ngày cách hôm nay daysAgo ngày (0 = hôm nay)
function startOfDayAgo(daysAgo, now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
}

// n ngày gần nhất tính cả hôm nay, cũ trước mới sau
function lastNDays(n, now = new Date()) {
  const keys = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    keys.push(dayKey(startOfDayAgo(i, now)));
  }
  return { start: startOfDayAgo(n - 1, now), keys };
}

// n tháng gần nhất tính cả tháng này, cũ trước mới sau
function lastNMonths(n, now = new Date()) {
  const keys = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return { start: new Date(now.getFullYear(), now.getMonth() - (n - 1), 1), keys };
}

// Cộng kết quả groupBy theo cột thời gian vào từng ngày / tháng
function countByPeriod(groups, field, toKey, keys) {
  const counts = new Map(keys.map((key) => [key, 0]));
  for (const group of groups) {
    const key = toKey(new Date(group[field]));
    if (counts.has(key)) {
      counts.set(key, counts.get(key) + group._count._all);
    }
  }
  return keys.map((key) => ({ key, count: counts.get(key) }));
}

// Kết quả groupBy theo enum -> đủ mọi giá trị của enum, thiếu thì 0
function countByEnum(groups, field, values) {
  const counts = new Map(values.map((value) => [value, 0]));
  for (const group of groups) {
    if (counts.has(group[field])) {
      counts.set(group[field], group._count._all);
    }
  }
  return values.map((value) => ({ [field]: value, count: counts.get(value) }));
}

module.exports = { dayKey, monthKey, startOfDayAgo, lastNDays, lastNMonths, countByPeriod, countByEnum };
