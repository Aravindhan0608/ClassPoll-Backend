import ApiError from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { isProd } from '../config/env.js';

/**
 * Converts any thrown error (ApiError or otherwise — Mongoose errors,
 * JSON parse errors, unexpected exceptions) into the same consistent
 * JSON error shape the frontend expects everywhere.
 * Must be registered LAST, after all routes.
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    let errors = [];

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation failed';
      errors = Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }));
    }

    // Mongoose duplicate key error
    if (error.code === 11000) {
      statusCode = 409;
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      message = `${field} already exists`;
      errors = [{ field, message }];
    }

    // Mongoose invalid ObjectId
    if (error.name === 'CastError') {
      statusCode = 400;
      message = `Invalid value for ${error.path}`;
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
    }
    if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
    }

    error = new ApiError(statusCode, message, errors, error.stack);
  }

  if (error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${error.message}\n${error.stack}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${error.statusCode} ${error.message}`);
  }

  return res.status(error.statusCode).json({
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || [],
    ...(isProd ? {} : { stack: error.stack }),
  });
};

export default errorMiddleware;
