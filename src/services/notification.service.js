import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';

/**
 * Lists the current user's notifications, most recent first, with basic
 * pagination and an optional read/unread filter.
 */
export const getMyNotifications = async (userId, { isRead, page = 1, limit = 20 } = {}) => {
  const filter = { userId };
  if (isRead !== undefined) filter.isRead = isRead;

  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Returns how many unread notifications the current user has — the number
 * a dashboard badge would show.
 */
export const getUnreadCount = async (userId) => Notification.countDocuments({ userId, isRead: false });

/**
 * Marks a single notification as read. Only the owning user may do this.
 */
export const markAsRead = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw ApiError.badRequest('Invalid notification id');
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  if (notification.userId.toString() !== userId.toString()) {
    throw ApiError.forbidden('You do not have access to this notification');
  }

  notification.isRead = true;
  await notification.save();

  return notification;
};

/**
 * Marks every one of the current user's notifications as read in one shot
 * (e.g. "mark all as read" button).
 */
export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );

  return { modifiedCount: result.modifiedCount };
};

/**
 * Deletes a single notification. Only the owning user may do this.
 */
export const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  if (notification.userId.toString() !== userId.toString()) {
    throw ApiError.forbidden('You do not have access to this notification');
  }

  await notification.deleteOne();
};
