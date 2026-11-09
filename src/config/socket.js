import mongoose from 'mongoose';
import { Server } from 'socket.io';
import cookie from 'cookie';
import { verifyAccessToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';
import { env } from './env.js';
import Class from '../models/Class.js';
import Poll from '../models/Poll.js';

/**
 * Module-level singleton so services (which run outside the request/response
 * cycle sometimes, e.g. after a DB write) can emit events without every
 * function needing `io` threaded through its parameters. Set once by
 * initSocket() at boot; read via getIO() from socket.service.js.
 */
let ioInstance = null;

/**
 * Tracks how many sockets are currently in each `class:<id>` room, purely
 * in memory. Good enough for a single-instance deployment; if this ever
 * runs on multiple server instances behind a load balancer, swap this for
 * a Redis-backed adapter (socket.io-redis) so counts stay accurate across
 * instances.
 */
const classOnlineCounts = new Map();

const bumpClassCount = (io, classId, delta) => {
  const next = Math.max(0, (classOnlineCounts.get(classId) || 0) + delta);
  classOnlineCounts.set(classId, next);
  io.to(`class:${classId}`).emit('class:onlineCount', { classId, count: next });
};

/**
 * Initializes Socket.io on top of the existing HTTP server, authenticating
 * each connecting socket using the same access token used by REST routes.
 *
 * Room strategy:
 *   - `class:<classId>`   -> everyone viewing a class (students + teacher) — used for
 *                            poll:started/ended, question:new/answered, class:onlineCount
 *   - `poll:<pollId>`     -> everyone actively watching one live poll — used for poll:voteUpdate
 *   - `user:<userId>`     -> private channel for a specific person — used for personal
 *                            notification:new pushes (e.g. "your question was answered")
 */
export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const rawCookieHeader = socket.handshake.headers?.cookie;
      const parsedCookies = rawCookieHeader ? cookie.parse(rawCookieHeader) : {};
      const token = socket.handshake.auth?.token || parsedCookies.accessToken;

      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(token);
      socket.user = decoded; // { id, role }
      return next();
    } catch {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user ${socket.user?.id})`);

    socket.join(`user:${socket.user.id}`);
    socket.joinedClasses = new Set();

    socket.on('class:join', async (classId) => {
      if (!classId || !mongoose.Types.ObjectId.isValid(classId)) return;
      try {
        const classDoc = await Class.findById(classId);
        if (!classDoc) return;

        const isAdmin = socket.user?.role === 'admin';
        const isTeacherOwner =
          socket.user?.role === 'teacher' && classDoc.teacherId.toString() === socket.user.id;
        const isEnrolledStudent =
          socket.user?.role === 'student' &&
          classDoc.students.some((s) => s.toString() === socket.user.id);

        if (!isAdmin && !isTeacherOwner && !isEnrolledStudent) {
          logger.warn(
            `Unauthorized socket class:join attempt: user ${socket.user?.id} on class ${classId}`
          );
          return;
        }

        socket.join(`class:${classId}`);
        if (!socket.joinedClasses.has(classId)) {
          socket.joinedClasses.add(classId);
          bumpClassCount(io, classId, 1);
        }
      } catch (err) {
        logger.error(`Error in socket class:join: ${err.message}`);
      }
    });

    socket.on('class:leave', (classId) => {
      if (!classId) return;
      socket.leave(`class:${classId}`);
      if (socket.joinedClasses.has(classId)) {
        socket.joinedClasses.delete(classId);
        bumpClassCount(io, classId, -1);
      }
    });

    socket.on('poll:join', async (pollId) => {
      if (!pollId || typeof pollId !== 'string' || !mongoose.Types.ObjectId.isValid(pollId)) return;
      if (!socket.user?.id || !socket.user?.role) return;

      try {
        const poll = await Poll.findById(pollId);
        if (!poll) return;

        const classDoc = await Class.findById(poll.classId);
        if (!classDoc) return;

        const isAdmin = socket.user.role === 'admin';
        const isTeacherOwner =
          socket.user.role === 'teacher' && classDoc.teacherId.toString() === socket.user.id;
        const isEnrolledStudent =
          socket.user.role === 'student' &&
          classDoc.students.some((s) => s.toString() === socket.user.id);

        if (!isAdmin && !isTeacherOwner && !isEnrolledStudent) {
          logger.warn(
            `Unauthorized socket poll:join attempt: user ${socket.user.id} on poll ${pollId}`
          );
          return;
        }

        // Disallow student socket room access if teacher has turned off live results
        if (isEnrolledStudent && !poll.allowResult) {
          logger.warn(
            `Forbidden socket poll:join: student ${socket.user.id} denied access to poll ${pollId} (results hidden by teacher)`
          );
          return;
        }

        socket.join(`poll:${pollId}`);
      } catch (err) {
        logger.error(`Error in socket poll:join: ${err.message}`);
      }
    });

    socket.on('poll:leave', (pollId) => {
      if (pollId) socket.leave(`poll:${pollId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      socket.joinedClasses?.forEach((classId) => bumpClassCount(io, classId, -1));
    });
  });

  ioInstance = io;
  return io;
};

/**
 * Returns the live Socket.io instance, or null if sockets haven't been
 * initialized yet (e.g. during tests that only spin up Express, not http).
 * Callers should treat a null return as "real-time push unavailable, but
 * the underlying REST action still succeeded" — sockets are an enhancement,
 * never a requirement for correctness.
 */
export const getIO = () => ioInstance;
