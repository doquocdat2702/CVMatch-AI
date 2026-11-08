const cvService = require('./cv.service');
const { success } = require('../../utils/response');

async function upload(req, res, next) {
  try {
    const data = await cvService.createCv(req.user.userId, req.file, req.candidateProfileId);
    return success(res, data, 'Đã tải CV lên.', 201);
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const data = await cvService.listMyCvs(req.user.userId);
    return success(res, data, 'Lấy danh sách CV thành công');
  } catch (err) {
    return next(err);
  }
}

async function detail(req, res, next) {
  try {
    const data = await cvService.getCvDetail(req.user.userId, req.params.id);
    return success(res, data, 'Lấy chi tiết CV thành công');
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const data = await cvService.deleteCv(req.user.userId, req.params.id);
    return success(res, data, 'Đã xóa CV.');
  } catch (err) {
    return next(err);
  }
}

async function extract(req, res, next) {
  try {
    const data = await cvService.extractCvText(req.user.userId, req.params.id);
    return success(res, data, 'Đã đọc nội dung CV.');
  } catch (err) {
    return next(err);
  }
}

async function parse(req, res, next) {
  try {
    const data = await cvService.parseCvToProfile(req.user.userId, req.params.id);
    return success(res, data, 'Đã phân tích CV.');
  } catch (err) {
    return next(err);
  }
}

const MIME_BY_TYPE = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// Content-Disposition có tên file tiếng Việt: filename* mã hóa UTF-8 theo RFC 5987 / 6266,
// kèm filename ASCII dự phòng (bỏ dấu, thay ký tự lạ) cho trình duyệt cũ.
// encodeURIComponent chừa lại ' ( ) * nên mã hóa thêm cho đúng attr-char
function contentDisposition(type, fileName) {
  const ascii =
    String(fileName)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^\x20-\x7e]|["\\]/g, '_') || 'cv';
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

// GET /cvs/:id/file: PDF xem ngay trên trình duyệt (inline), DOCX tải về (attachment).
// Không phục vụ thư mục upload dạng file tĩnh; mọi lần đọc file đều qua kiểm tra quyền ở service
async function file(req, res, next) {
  try {
    const { absolutePath, fileName, fileType } = await cvService.getCvFile(req.user, req.params.id);
    const isPdf = fileType === 'PDF';
    res.setHeader('Content-Type', MIME_BY_TYPE[fileType] || 'application/octet-stream');
    res.setHeader('Content-Disposition', contentDisposition(isPdf ? 'inline' : 'attachment', fileName));
    // CV là dữ liệu cá nhân: không cho trình duyệt / proxy lưu đệm
    res.setHeader('Cache-Control', 'private, no-store');
    return res.sendFile(absolutePath, (err) => {
      if (err && !res.headersSent) next(err);
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { upload, list, detail, file, remove, extract, parse };
