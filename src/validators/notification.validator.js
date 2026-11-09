import { param, query } from 'express-validator';

export const notificationIdParamValidator = [
  param('id').isMongoId().withMessage('Invalid notification id'),
];

export const listNotificationsValidator = [
  query('isRead')
    .optional()
    .isBoolean()
    .withMessage('isRead must be true or false')
    .toBoolean(),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
    .toInt(),
];
