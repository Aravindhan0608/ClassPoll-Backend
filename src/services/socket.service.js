import { getIO } from '../config/socket.js';
import { logger } from '../utils/logger.js';

/**
 * Every real-time push in the app goes through this module instead of
 * services calling getIO().emit(...) directly, so:
 *   - event names and payload shapes live in exactly one place
 *   - a missing/uninitialized io (e.g. in a script or test) never crashes
 *     the REST request that triggered it — sockets are additive, not required
 */
const safeEmit = (fn) => {
  const io = getIO();
  if (!io) {
    logger.debug('Socket.io not initialized — skipping real-time emit.');
    return;
  }
  try {
    fn(io);
  } catch (err) {
    logger.error(`Socket emit failed: ${err.message}`);
  }
};

/**
 * Poll went live — tell everyone currently viewing the class.
 */
export const emitPollStarted = (classId, poll) => {
  safeEmit((io) => io.to(`class:${classId}`).emit('poll:started', { poll }));
};

/**
 * Poll ended — tell everyone currently viewing the class, and separately
 * anyone still watching the poll's own room (e.g. a results screen).
 */
export const emitPollEnded = (classId, poll) => {
  safeEmit((io) => {
    io.to(`class:${classId}`).emit('poll:ended', { poll });
    io.to(`poll:${poll._id}`).emit('poll:ended', { poll });
  });
};

/**
 * A vote was just cast — push the fresh tally to everyone watching that
 * specific poll's results screen. Vote-by-vote, not just on end, so the
 * "live" in Live Poll Updates is real.
 */
export const emitVoteUpdate = (pollId, { results, totalVotes }) => {
  safeEmit((io) => io.to(`poll:${pollId}`).emit('poll:voteUpdate', { pollId, results, totalVotes }));
};

/**
 * A student asked a question — notify the teacher's personal channel so
 * their dashboard badge/toast updates without a refresh.
 */
export const emitNewQuestion = (teacherId, question) => {
  safeEmit((io) => {
    io.to(`user:${teacherId}`).emit('question:new', { question });
    io.to(`user:${teacherId}`).emit('notification:new', {
      title: 'New question',
      type: 'question',
    });
  });
};

/**
 * A teacher answered a question — notify the asking student's personal channel.
 */
export const emitQuestionAnswered = (studentId, question) => {
  safeEmit((io) => {
    io.to(`user:${studentId}`).emit('question:answered', { question });
    io.to(`user:${studentId}`).emit('notification:new', {
      title: 'Your question was answered',
      type: 'question',
    });
  });
};

/**
 * Generic class-wide announcement/broadcast (e.g. teacher posts a note).
 * Exposed now so the Class Module (or a future controller) can use it
 * without needing another round of wiring later.
 */
export const emitClassAnnouncement = (classId, { title, message }) => {
  safeEmit((io) =>
    io.to(`class:${classId}`).emit('class:announcement', { classId, title, message })
  );
};
