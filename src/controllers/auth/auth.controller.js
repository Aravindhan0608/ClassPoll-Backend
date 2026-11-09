import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import { cookieOptions, clearCookieOptions, verifyAccessToken } from '../../utils/jwt.js';
import * as authService from '../../services/auth.service.js';

const ACCESS_COOKIE_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_COOKIE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, cookieOptions(ACCESS_COOKIE_MS));
  res.cookie('refreshToken', refreshToken, cookieOptions(REFRESH_COOKIE_MS));
};

/**
 * POST /api/auth/register/student
 */
export const registerStudent = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.registerUser({
    name,
    email,
    password,
    role: 'student',
  });

  setAuthCookies(res, accessToken, refreshToken);
  return new ApiResponse(201, 'Student registered successfully', { user }).send(res);
});

/**
 * POST /api/auth/register/teacher
 * Public teacher self-registration is disabled for security. Teacher accounts
 * must be verified and provisioned by an administrator.
 */
export const registerTeacher = asyncHandler(async (req, res) => {
  throw ApiError.forbidden(
    'Public teacher registration is disabled. Teacher accounts must be authorized and provisioned by an administrator.'
  );
});

/**
 * POST /api/auth/login
 * Works for all roles (student, teacher, admin) since admins log in
 * through the same endpoint — they just never register through it.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.loginUser({ email, password });

  setAuthCookies(res, accessToken, refreshToken);
  return new ApiResponse(200, 'Login successful', { user }).send(res);
});

/**
 * POST /api/auth/refresh
 */
export const refresh = asyncHandler(async (req, res) => {
  const incoming = req.cookies?.refreshToken;
  try {
    const { user, accessToken, refreshToken, reuseCurrentCookie } =
      await authService.refreshAccessToken(incoming);

    if (reuseCurrentCookie) {
      res.cookie('accessToken', accessToken, cookieOptions(ACCESS_COOKIE_MS));
    } else {
      setAuthCookies(res, accessToken, refreshToken);
    }

    return new ApiResponse(200, 'Token refreshed', { user }).send(res);
  } catch (error) {
    // Clear cookies on any refresh failure (expired, invalid, or reuse detected)
    res.clearCookie('accessToken', clearCookieOptions());
    res.clearCookie('refreshToken', clearCookieOptions());
    throw error;
  }
});

/**
 * POST /api/auth/logout
 * Works cleanly even when the access token has already expired (> 15 minutes),
 * invalidating the stored refresh token in MongoDB and clearing cookies.
 */
export const logout = asyncHandler(async (req, res) => {
  const bearerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;
  const accessToken = req.cookies?.accessToken || bearerToken;
  const refreshToken = req.cookies?.refreshToken;

  // 1. Invalidate session by access token if still valid
  if (accessToken) {
    try {
      const decoded = verifyAccessToken(accessToken);
      if (decoded?.id) {
        await authService.logoutUser(decoded.id);
      }
    } catch {
      // Access token expired or invalid — ignore and fallback to refresh token
    }
  }

  // 2. Invalidate session by refresh token hash (even when access token has expired)
  if (refreshToken) {
    await authService.logoutByRefreshToken(refreshToken);
  }

  // 3. Clear authentication cookies unconditionally
  res.clearCookie('accessToken', clearCookieOptions());
  res.clearCookie('refreshToken', clearCookieOptions());

  return new ApiResponse(200, 'Logged out successfully').send(res);
});

/**
 * GET /api/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized('Not authenticated');
  }
  return new ApiResponse(200, 'Current user fetched', { user: req.user.toSafeJSON() }).send(res);
});
