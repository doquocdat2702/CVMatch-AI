const notificationService = require('./notification.service');
const { success } = require('../../utils/response');

async function list(req, res, next) {
  try {
    const data = await notificationService.listMyNotifications(req.user.userId, req.query || {});
    return success(res, data, 'Lấy danh sách thông báo thành công');
  } catch (err) {
    return next(err);
  }
}

async function unreadCount(req, res, next) {
  try {
    const data = await notificationService.countUnread(req.user.userId);
    return success(res, data, 'Lấy số thông báo chưa đọc thành công');
  } catch (err) {
    return next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const data = await notificationService.markAsRead(req.user.userId, req.params.id);
    return success(res, data, 'Đã đánh dấu thông báo là đã đọc');
  } catch (err) {
    return next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    const data = await notificationService.markAllAsRead(req.user.userId);
    return success(res, data, `Đã đánh dấu ${data.count} thông báo là đã đọc`);
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, unreadCount, markRead, markAllRead };
