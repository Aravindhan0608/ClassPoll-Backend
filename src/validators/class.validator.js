import { body, param } from 'express-validator';

export const createClassValidator = [
  body('className')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Class name must be between 2 and 100 characters'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
];

export const updateClassValidator = [
  param('id').isMongoId().withMessage('Invalid class id'),
  body('className')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Class name must be between 2 and 100 characters'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
];

export const classIdParamValidator = [param('id').isMongoId().withMessage('Invalid class id')];

export const joinClassValidator = [
  body('classCode')
    .trim()
    .notEmpty()
    .withMessage('Class code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Class code must be 6 characters'),
];

export const removeStudentValidator = [
  param('id').isMongoId().withMessage('Invalid class id'),
  param('studentId').isMongoId().withMessage('Invalid student id'),
];
