import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as notificationService from '../../services/notification.service.js';

/**
 * GET /api/notifications  (any authenticated user)
 * Optional query: ?isRead=true|false&page=1&limit=20
 */
export const getMyNotifications = asyncHandler(async (req, res) => {
  const { isRead, page, limit } = req.query;
  const { notifications, pagination } = await notificationService.getMyNotifications(req.user._id, {
    isRead,
    page,
    limit,
  });

  return new ApiResponse(200, 'Notifications fetched successfully', {
    notifications,
    pagination,
  }).send(res);
});

/**
 * GET /api/notifications/unread-count  (any authenticated user)
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);

  return new ApiResponse(200, 'Unread count fetched successfully', { count }).send(res);
});

/**
 * PATCH /api/notifications/:id/read  (owning user)
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user._id);

  return new ApiResponse(200, 'Notification marked as read', { notification }).send(res);
});

/**
 * PATCH /api/notifications/read-all  (any authenticated user)
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const { modifiedCount } = await notificationService.markAllAsRead(req.user._id);

  return new ApiResponse(200, 'All notifications marked as read', { modifiedCount }).send(res);
});

/**
 * DELETE /api/notifications/:id  (owning user)
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user._id);

  return new ApiResponse(200, 'Notification deleted successfully').send(res);
});
