// Quy tắc thử lại khi gọi Gemini, dùng chung cho parse CV (nlp.parser) và phân loại JD (requirement.classifier).
// CHỈ thử lại lỗi tạm thời: mất mạng, quá thời gian chờ, HTTP 5xx.
// KHÔNG thử lại: 429 (hết hạn mức), 401 / 403 (sai key, không có quyền), các mã 4xx khác,
// và lỗi nội dung (JSON hỏng, bị chặn...) vì gọi lại cũng ra kết quả như cũ.

const MAX_RETRY = 2; // tối đa 2 lần thử lại, tổng cộng 3 lần gọi
// Chờ giữa các lần thử để dịch vụ kịp hồi lại
const RETRY_DELAY_MS = [3000, 8000];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// err.httpStatus do hàm gọi API gắn khi Gemini trả HTTP lỗi
function isTransientLlmError(err) {
  if (!err) {
    return false;
  }
  // Quá thời gian chờ (AbortController / AbortSignal.timeout)
  if (err.name === 'AbortError' || err.name === 'TimeoutError') {
    return true;
  }
  if (Number.isInteger(err.httpStatus)) {
    return err.httpStatus >= 500;
  }
  // fetch của Node ném TypeError khi mất mạng, lỗi DNS, kết nối bị ngắt
  return err.name === 'TypeError';
}

// Gọi fn(); lỗi tạm thời thì chờ rồi gọi lại, tối đa MAX_RETRY lần.
// onFail(err, attempt, willRetry) được gọi sau MỖI lần thất bại để hàm gọi tự ghi log.
async function callWithRetry(fn, onFail) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      const willRetry = attempt <= MAX_RETRY && isTransientLlmError(err);
      if (onFail) {
        onFail(err, attempt, willRetry);
      }
      if (!willRetry) {
        throw err;
      }
      await delay(RETRY_DELAY_MS[attempt - 1]);
    }
  }
}

module.exports = { MAX_RETRY, RETRY_DELAY_MS, isTransientLlmError, callWithRetry };
