import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

import { env, isProd } from './config/env.js';
import errorMiddleware from './middleware/error.middleware.js';
import ApiError from './utils/ApiError.js';

import authRoutes from './routes/auth.routes.js';
import classRoutes from './routes/class.routes.js';
import pollRoutes from './routes/poll.routes.js';
import voteRoutes from './routes/vote.routes.js';
import questionRoutes from './routes/question.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import profileRoutes from './routes/profile.routes.js';

const app = express();

// --- Security & parsing middleware ---
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(morgan(isProd ? 'combined' : 'dev'));

// CSRF Origin/Referer verification for cookie-authenticated state-changing requests
app.use((req, res, next) => {
  const stateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!stateChanging.includes(req.method)) {
    return next();
  }

  // Only apply when request carries cookie credentials
  const hasAuthCookies = Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
  if (!hasAuthCookies) {
    return next();
  }

  const origin =
    req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);

  if (origin) {
    try {
      const allowedOrigin = new URL(env.CLIENT_URL).origin;
      if (origin !== allowedOrigin) {
        return next(
          ApiError.forbidden(`Cross-site request blocked: origin ${origin} is not allowed`)
        );
      }
    } catch {
      return next(ApiError.forbidden('Malformed origin or referer header'));
    }
  }
  next();
});

// Global rate limiter — tighter limits are applied per-route for
// sensitive endpoints like login/register inside their own routers if needed.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, statusCode: 429, message: 'Too many requests, please try again later.' },
});
app.use('/api', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, statusCode: 429, message: 'Too many auth attempts, please try again later.' },
});

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'ClassPoll+ API is running', timestamp: new Date() });
});

// --- Routes ---
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);

// --- 404 handler for unmatched API routes ---
app.use('/api', (req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
});

// --- Centralized error handler (always last) ---
app.use(errorMiddleware);

export default app;
