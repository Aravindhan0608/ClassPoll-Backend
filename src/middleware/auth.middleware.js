import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';

/**
 * Verifies the access token (from httpOnly cookie or Authorization header),
 * loads the corresponding user, and attaches it to req.user.
 * Any downstream route can then trust req.user to be a real, active account.
 */
const authMiddleware = asyncHandler(async (req, res, next) => {
  const bearerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;

  const token = req.cookies?.accessToken || bearerToken;

  if (!token) {
    throw ApiError.unauthorized('Authentication required. Please log in.');
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Session expired. Please log in again.');
    }
    throw ApiError.unauthorized('Invalid authentication token.');
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    throw ApiError.unauthorized('User belonging to this token no longer exists.');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.');
  }

  req.user = user;
  next();
});

export default authMiddleware;
