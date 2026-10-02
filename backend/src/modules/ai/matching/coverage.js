// Requirement Coverage: tỉ lệ yêu cầu của JD có bằng chứng rõ ràng trong hồ sơ ứng viên.
// Đây CHỈ là chỉ số hỗ trợ đối chiếu, KHÔNG phải điểm năng lực, KHÔNG quyết định tuyển dụng.
// Không trọng số: REQUIRED, PREFERRED, OPTIONAL đều tính như nhau.
//
// Test case:
//   [SUPPORTED, SUPPORTED, UNCERTAIN, NOT_FOUND]  -> coverage 50, supported 2, uncertain 1, notFound 1
//   [SUPPORTED, UNCERTAIN, NOT_FOUND]             -> coverage 33.3
//   []                                            -> coverage 0, total 0 (không chia cho 0)

const COVERAGE_NOTE =
  'Requirement Coverage chỉ là chỉ số hỗ trợ đối chiếu yêu cầu, ' +
  'không phải điểm đánh giá năng lực ứng viên và không phải quyết định tuyển dụng.';

function calculateCoverage(matrix) {
  const rows = Array.isArray(matrix) ? matrix : [];

  let supported = 0;
  let uncertain = 0;
  let notFound = 0;

  rows.forEach((row) => {
    const status = row && row.status;
    if (status === 'SUPPORTED') {
      supported += 1;
    } else if (status === 'UNCERTAIN') {
      uncertain += 1;
    } else {
      notFound += 1;
    }
  });

  const total = rows.length;
  const coverage = total === 0 ? 0 : Math.round((supported / total) * 100 * 10) / 10;

  return { coverage, supported, uncertain, notFound, total, note: COVERAGE_NOTE };
}

module.exports = { calculateCoverage, COVERAGE_NOTE };
