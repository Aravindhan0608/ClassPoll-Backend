import { body, param } from 'express-validator';

export const castVoteValidator = [
  body('pollId').isMongoId().withMessage('Invalid poll id'),
  body('optionId').isMongoId().withMessage('Invalid option id'),
];

export const pollIdParamValidator = [param('pollId').isMongoId().withMessage('Invalid poll id')];
