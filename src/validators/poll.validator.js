import { body, param } from 'express-validator';

export const createPollValidator = [
  body('classId').isMongoId().withMessage('Invalid class id'),
  body('question')
    .trim()
    .isLength({ min: 3, max: 300 })
    .withMessage('Question must be between 3 and 300 characters'),
  body('options')
    .isArray({ min: 2 })
    .withMessage('A poll must have at least 2 options'),
  body('options.*')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Each option must be between 1 and 200 characters'),
  body('allowResult').optional().isBoolean().withMessage('allowResult must be a boolean'),
];

export const updatePollValidator = [
  param('id').isMongoId().withMessage('Invalid poll id'),
  body('question')
    .optional()
    .trim()
    .isLength({ min: 3, max: 300 })
    .withMessage('Question must be between 3 and 300 characters'),
  body('options')
    .optional()
    .isArray({ min: 2 })
    .withMessage('A poll must have at least 2 options'),
  body('options.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Each option must be between 1 and 200 characters'),
  body('allowResult').optional().isBoolean().withMessage('allowResult must be a boolean'),
];

export const pollIdParamValidator = [param('id').isMongoId().withMessage('Invalid poll id')];

export const classIdParamValidator = [param('classId').isMongoId().withMessage('Invalid class id')];
