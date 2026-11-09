import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/**
 * Runs after an array of express-validator check() rules. Collects any
 * validation failures into a single, consistently-shaped 400 error instead
 * of letting each route reimplement this boilerplate.
 */
const validateMiddleware = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return next(ApiError.badRequest('Validation failed', formatted));
  }

  return next();
};

export default validateMiddleware;
