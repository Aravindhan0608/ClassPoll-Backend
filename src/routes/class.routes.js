import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import roleMiddleware from '../middleware/role.middleware.js';
import validateMiddleware from '../middleware/validate.middleware.js';
import {
  createClassValidator,
  updateClassValidator,
  classIdParamValidator,
  joinClassValidator,
  removeStudentValidator,
} from '../validators/class.validator.js';
import {
  createClass,
  getMyTeacherClasses,
  getMyStudentClasses,
  getClassById,
  updateClass,
  archiveClass,
  regenerateJoinCode,
  joinClass,
  removeStudent,
} from '../controllers/class/class.controller.js';

const router = Router();

// All class routes require authentication.
router.use(authMiddleware);

// --- Teacher routes ---
router.post('/', roleMiddleware('teacher'), createClassValidator, validateMiddleware, createClass);
router.get('/teacher/my', roleMiddleware('teacher'), getMyTeacherClasses);
router.post(
  '/:id/regenerate-code',
  roleMiddleware('teacher', 'admin'),
  classIdParamValidator,
  validateMiddleware,
  regenerateJoinCode
);
router.delete(
  '/:id/students/:studentId',
  roleMiddleware('teacher', 'admin'),
  removeStudentValidator,
  validateMiddleware,
  removeStudent
);

// --- Student routes ---
router.get('/student/my', roleMiddleware('student'), getMyStudentClasses);
router.post('/join', roleMiddleware('student'), joinClassValidator, validateMiddleware, joinClass);

// --- Shared routes (access checked inside the service layer) ---
router.get('/:id', classIdParamValidator, validateMiddleware, getClassById);
router.patch(
  '/:id',
  roleMiddleware('teacher', 'admin'),
  updateClassValidator,
  validateMiddleware,
  updateClass
);
router.delete(
  '/:id',
  roleMiddleware('teacher', 'admin'),
  classIdParamValidator,
  validateMiddleware,
  archiveClass
);

export default router;
