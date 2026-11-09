import crypto from 'crypto';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

const PUBLIC_ROLES = ['student']; // Teacher and admin accounts cannot be created via public self-registration
const CONCURRENT_REFRESH_GRACE_MS = 15 * 1000; // 15s grace window for concurrent browser requests

/**
 * Computes a SHA-256 hash of a raw token string for secure database storage and comparison.
 */
export const hashToken = (token) => {
  if (!token || typeof token !== 'string') return '';
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Registers a new student account.
 * Teacher and Admin accounts are intentionally excluded from public self-registration.
 */
export const registerUser = async ({ name, email, password, role }) => {
  if (role === 'teacher') {
    throw ApiError.forbidden(
      'Public teacher registration is disabled. Teacher accounts must be authorized and provisioned by an administrator.'
    );
  }

  if (!PUBLIC_ROLES.includes(role)) {
    throw ApiError.forbidden('Public registration is only available for students.');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.');
  }

  const user = await User.create({ name, email, password, role: 'student' });

  return issueTokensForUser(user);
};

/**
 * Authenticates any role (student, teacher, or admin) by email/password.
 */
export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password +refreshToken');

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Contact an administrator.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  return issueTokensForUser(user);
};

/**
 * Issues a fresh access/refresh token pair and persists only the SHA-256 hash
 * of the refresh token in MongoDB, keeping raw credentials out of the database.
 */
const issueTokensForUser = async (user) => {
  const payload = { id: user._id.toString(), role: user.role };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshToken = hashToken(refreshToken);
  user.previousRefreshToken = null;
  user.tokenRotatedAt = new Date();
  await user.save({ validateBeforeSave: false });

  return { user: user.toSafeJSON(), accessToken, refreshToken };
};

/**
 * Exchanges a valid refresh token for a new access token, rotating the
 * refresh token in the process to limit the blast radius of a stolen token.
 * Includes token reuse detection and a grace period for concurrent requests.
 */
export const refreshAccessToken = async (incomingRefreshToken) => {
  if (!incomingRefreshToken || typeof incomingRefreshToken !== 'string') {
    throw ApiError.unauthorized('Refresh token missing.');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingRefreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token.');
  }

  const user = await User.findById(decoded.id).select(
    '+refreshToken +previousRefreshToken +tokenRotatedAt'
  );

  if (!user) {
    throw ApiError.unauthorized('User belonging to this token no longer exists.');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.');
  }

  const incomingHash = hashToken(incomingRefreshToken);

  // 1. Normal rotation: incoming token matches current active hashed token
  if (user.refreshToken && user.refreshToken === incomingHash) {
    const payload = { id: user._id.toString(), role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    user.previousRefreshToken = user.refreshToken;
    user.refreshToken = hashToken(refreshToken);
    user.tokenRotatedAt = new Date();
    await user.save({ validateBeforeSave: false });

    return { user: user.toSafeJSON(), accessToken, refreshToken };
  }

  // 2. Concurrent request handling: incoming token matches the previously rotated token
  // within a short grace period (e.g. multiple tabs firing simultaneously)
  const isWithinGrace =
    user.tokenRotatedAt &&
    Date.now() - new Date(user.tokenRotatedAt).getTime() < CONCURRENT_REFRESH_GRACE_MS;

  if (user.previousRefreshToken && user.previousRefreshToken === incomingHash && isWithinGrace) {
    const payload = { id: user._id.toString(), role: user.role };
    const accessToken = signAccessToken(payload);
    return { user: user.toSafeJSON(), accessToken, refreshToken: null, reuseCurrentCookie: true };
  }

  // 3. Token Reuse / Replay Detected:
  // An invalidated, replayed, or un-matched token was presented.
  // Immediately revoke all sessions for this user to protect against theft.
  user.refreshToken = null;
  user.previousRefreshToken = null;
  user.tokenRotatedAt = null;
  await user.save({ validateBeforeSave: false });

  throw ApiError.unauthorized('Invalid refresh token or token reuse detected. Please log in again.');
};

/**
 * Invalidates the stored refresh token so the old one can no longer be
 * exchanged for new access tokens.
 */
export const logoutUser = async (userId) => {
  if (!userId) return;
  await User.findByIdAndUpdate(userId, {
    $unset: { refreshToken: 1, previousRefreshToken: 1, tokenRotatedAt: 1 },
  });
};

/**
 * Invalidates session by matching the SHA-256 hash of the incoming refresh token.
 * Used during logout when the access token has already expired.
 */
export const logoutByRefreshToken = async (incomingRefreshToken) => {
  if (!incomingRefreshToken || typeof incomingRefreshToken !== 'string') return;
  try {
    const hashed = hashToken(incomingRefreshToken);
    await User.findOneAndUpdate(
      { $or: [{ refreshToken: hashed }, { previousRefreshToken: hashed }] },
      { $unset: { refreshToken: 1, previousRefreshToken: 1, tokenRotatedAt: 1 } }
    );
  } catch {
    // Catch DB errors to ensure logout response is never blocked
  }
};
