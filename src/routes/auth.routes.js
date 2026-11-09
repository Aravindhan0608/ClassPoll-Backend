import { Router } from 'express';
import {
  registerStudent,
  registerTeacher,
  login,
  refresh,
  logout,
  getMe,
} from '../controllers/auth/auth.controller.js';
import { registerValidator, loginValidator } from '../validators/auth.validator.js';
import validateMiddleware from '../middleware/validate.middleware.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register/student', registerValidator, validateMiddleware, registerStudent);
router.post('/register/teacher', registerValidator, validateMiddleware, registerTeacher);
router.post('/login', loginValidator, validateMiddleware, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMe);

export default router;
