import { body, param, query } from 'express-validator';

export const userIdParamValidator = [param('id').isMongoId().withMessage('Invalid user id')];

export const classIdParamValidator = [param('id').isMongoId().withMessage('Invalid class id')];

export const listUsersValidator = [
  query('role')
    .optional()
    .isIn(['student', 'teacher', 'admin'])
    .withMessage('role must be student, teacher, or admin'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('search is too long'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
    .toInt(),
];

export const listClassesValidator = [
  query('search').optional().trim().isLength({ max: 100 }).withMessage('search is too long'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
    .toInt(),
];

export const updateUserValidator = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('name').optional().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];
