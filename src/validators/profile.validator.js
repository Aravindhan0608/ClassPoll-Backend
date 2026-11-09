import { body } from 'express-validator';

export const upsertProfileValidator = [
  body('rollNumber')
    .trim()
    .notEmpty()
    .withMessage('Roll number is required')
    .isLength({ max: 30 })
    .withMessage('Roll number is too long'),
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required')
    .isLength({ max: 100 })
    .withMessage('Department is too long'),
  body('year')
    .trim()
    .notEmpty()
    .withMessage('Year is required')
    .isLength({ max: 20 })
    .withMessage('Year is too long'),
  body('section')
    .trim()
    .notEmpty()
    .withMessage('Section is required')
    .isLength({ max: 20 })
    .withMessage('Section is too long'),
  body('collegeName')
    .trim()
    .notEmpty()
    .withMessage('College name is required')
    .isLength({ max: 150 })
    .withMessage('College name is too long'),
];
