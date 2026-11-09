import { body, param, query } from 'express-validator';

export const askQuestionValidator = [
  body('classId').isMongoId().withMessage('Invalid class id'),
  body('question')
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage('Question must be between 3 and 1000 characters'),
];

export const answerQuestionValidator = [
  param('id').isMongoId().withMessage('Invalid question id'),
  body('answer')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Answer must be between 1 and 2000 characters'),
];

export const questionIdParamValidator = [param('id').isMongoId().withMessage('Invalid question id')];

export const classIdParamValidator = [param('classId').isMongoId().withMessage('Invalid class id')];

export const statusQueryValidator = [
  query('status')
    .optional()
    .isIn(['pending', 'answered'])
    .withMessage('status must be either pending or answered'),
];
