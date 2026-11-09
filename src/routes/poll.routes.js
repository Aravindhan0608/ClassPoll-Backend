import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import roleMiddleware from '../middleware/role.middleware.js';
import validateMiddleware from '../middleware/validate.middleware.js';
import {
  createPollValidator,
  updatePollValidator,
  pollIdParamValidator,
  classIdParamValidator,
} from '../validators/poll.validator.js';
import {
  createPoll,
  startPoll,
  endPoll,
  updatePoll,
  deletePoll,
  getPollsForClass,
  getActivePoll,
  getPollById,
  getPollResults,
} from '../controllers/poll/poll.controller.js';

const router = Router();

// All poll routes require authentication.
router.use(authMiddleware);

// --- Teacher routes ---
router.post('/', roleMiddleware('teacher'), createPollValidator, validateMiddleware, createPoll);
router.post(
  '/:id/start',
  roleMiddleware('teacher'),
  pollIdParamValidator,
  validateMiddleware,
  startPoll
);
router.post('/:id/end', roleMiddleware('teacher'), pollIdParamValidator, validateMiddleware, endPoll);
router.patch(
  '/:id',
  roleMiddleware('teacher'),
  updatePollValidator,
  validateMiddleware,
  updatePoll
);
router.delete(
  '/:id',
  roleMiddleware('teacher'),
  pollIdParamValidator,
  validateMiddleware,
  deletePoll
);

// --- Shared routes (access enforced in the service layer) ---
router.get('/class/:classId', classIdParamValidator, validateMiddleware, getPollsForClass);
router.get('/class/:classId/active', classIdParamValidator, validateMiddleware, getActivePoll);
router.get('/:id', pollIdParamValidator, validateMiddleware, getPollById);
router.get('/:id/results', pollIdParamValidator, validateMiddleware, getPollResults);

export default router;
