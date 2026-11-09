import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import roleMiddleware from '../middleware/role.middleware.js';
import validateMiddleware from '../middleware/validate.middleware.js';
import {
  userIdParamValidator,
  classIdParamValidator,
  listUsersValidator,
  listClassesValidator,
  updateUserValidator,
} from '../validators/admin.validator.js';
import {
  getDashboardOverview,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllClasses,
  archiveClass,
  getClassDetail,
  getUserActivity,
  getAnalytics,
} from '../controllers/admin/admin.controller.js';

const router = Router();

// Every route in this file is admin-only.
router.use(authMiddleware, roleMiddleware('admin'));

router.get('/dashboard', getDashboardOverview);
router.get('/analytics', getAnalytics);

router.get('/users', listUsersValidator, validateMiddleware, getUsers);
router.get('/users/:id', userIdParamValidator, validateMiddleware, getUserById);
router.get('/users/:id/activity', userIdParamValidator, validateMiddleware, getUserActivity);
router.patch('/users/:id', updateUserValidator, validateMiddleware, updateUser);
router.delete('/users/:id', userIdParamValidator, validateMiddleware, deleteUser);

router.get('/classes', listClassesValidator, validateMiddleware, getAllClasses);
router.get('/classes/:id', classIdParamValidator, validateMiddleware, getClassDetail);
router.delete('/classes/:id', classIdParamValidator, validateMiddleware, archiveClass);

export default router;
