import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import roleMiddleware from '../middleware/role.middleware.js';
import validateMiddleware from '../middleware/validate.middleware.js';
import { upsertProfileValidator } from '../validators/profile.validator.js';
import { getMyProfile, upsertMyProfile } from '../controllers/profile/profile.controller.js';

const router = Router();

// Every route here is scoped to "my own" student profile — there is no
// route that accepts another user's id, by design, since studentProfile
// data (roll number, department, section, college) is personally
// identifying and must never be reachable by a teacher or another student.
router.use(authMiddleware, roleMiddleware('student'));

router.get('/', getMyProfile);
router.put('/', upsertProfileValidator, validateMiddleware, upsertMyProfile);

export default router;
