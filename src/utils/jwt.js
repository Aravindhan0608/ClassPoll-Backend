import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Signs a short-lived access token carrying the minimum claims needed
 * for authorization decisions (id + role). Never embed sensitive data
 * (password hash, email) in the token payload.
 */
export const signAccessToken = (payload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });

/**
 * Signs a longer-lived refresh token used only to mint new access tokens.
 * Uses a cryptographically unique jti (JWT ID) so every refresh token is
 * globally unique even if issued in rapid succession.
 */
export const signRefreshToken = (payload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    jwtid: crypto.randomUUID(),
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);

export const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

/**
 * Cookie options shared by every place that sets an auth cookie, so the
 * security posture (httpOnly, sameSite, secure, path) stays consistent.
 */
export const cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  path: '/',
  maxAge: maxAgeMs,
});

/**
 * Matching options for clearing authentication cookies.
 */
export const clearCookieOptions = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  path: '/',
});
