import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import roleMiddleware from '../middleware/role.middleware.js';
import validateMiddleware from '../middleware/validate.middleware.js';
import { castVoteValidator, pollIdParamValidator } from '../validators/vote.validator.js';
import { castVote, getMyVote } from '../controllers/vote/vote.controller.js';

const router = Router();

// All voting routes require authentication and are student-only.
router.use(authMiddleware, roleMiddleware('student'));

router.post('/', castVoteValidator, validateMiddleware, castVote);
router.get('/my/:pollId', pollIdParamValidator, validateMiddleware, getMyVote);

export default router;
