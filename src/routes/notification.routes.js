import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import validateMiddleware from '../middleware/validate.middleware.js';
import {
  notificationIdParamValidator,
  listNotificationsValidator,
} from '../validators/notification.validator.js';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notification/notification.controller.js';

const router = Router();

// Every notification route is scoped to "my own notifications" —
// there is no cross-user access, so a single authMiddleware is all that's needed.
router.use(authMiddleware);

router.get('/', listNotificationsValidator, validateMiddleware, getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', notificationIdParamValidator, validateMiddleware, markAsRead);
router.delete('/:id', notificationIdParamValidator, validateMiddleware, deleteNotification);

export default router;
