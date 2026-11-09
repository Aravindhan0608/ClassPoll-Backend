import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import roleMiddleware from '../middleware/role.middleware.js';
import validateMiddleware from '../middleware/validate.middleware.js';
import {
  askQuestionValidator,
  answerQuestionValidator,
  questionIdParamValidator,
  classIdParamValidator,
  statusQueryValidator,
} from '../validators/question.validator.js';
import {
  askQuestion,
  answerQuestion,
  getQuestionsForClass,
  getQuestionById,
} from '../controllers/question/question.controller.js';

const router = Router();

// All question routes require authentication.
router.use(authMiddleware);

// --- Student routes ---
router.post('/', roleMiddleware('student'), askQuestionValidator, validateMiddleware, askQuestion);

// --- Teacher routes ---
router.patch(
  '/:id/answer',
  roleMiddleware('teacher'),
  answerQuestionValidator,
  validateMiddleware,
  answerQuestion
);

// --- Shared routes (access enforced in the service layer) ---
router.get(
  '/class/:classId',
  classIdParamValidator,
  statusQueryValidator,
  validateMiddleware,
  getQuestionsForClass
);
router.get('/:id', questionIdParamValidator, validateMiddleware, getQuestionById);

export default router;
