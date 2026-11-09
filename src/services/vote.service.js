import Poll from '../models/Poll.js';
import Vote from '../models/Vote.js';
import Class from '../models/Class.js';
import ApiError from '../utils/ApiError.js';
import { emitVoteUpdate } from './socket.service.js';
import { checkAndExpirePoll } from './poll.service.js';

/**
 * Casts a student's vote on a live poll.
 *
 * Guard rails, in order:
 *   1. Poll must exist and be `live` — no voting on drafts or ended polls.
 *   2. If poll.endTime has elapsed, it is automatically transitioned to `ended`
 *      and rejected.
 *   3. Student must be an enrolled member of the poll's class.
 *   4. optionId must be one of the poll's actual options.
 *   5. One vote per (pollId, studentId) — enforced here for a friendly
 *      error message, and again at the DB level via a unique compound
 *      index as the final safety net against race conditions.
 *
 * Broadcasts the fresh tally via Socket.io (`poll:voteUpdate`) to room
 * `poll:<pollId>` on success, so the live results screen updates instantly.
 */
export const castVote = async (studentId, { pollId, optionId }) => {
  const poll = await Poll.findById(pollId);
  if (!poll) {
    throw ApiError.notFound('Poll not found');
  }

  const isExpired = await checkAndExpirePoll(poll);
  if (isExpired || poll.status !== 'live') {
    throw ApiError.badRequest(isExpired ? 'This poll has expired' : 'This poll is not currently accepting votes');
  }

  const classDoc = await Class.findById(poll.classId);
  if (!classDoc) {
    throw ApiError.notFound('Class not found for this poll');
  }

  const isMember = classDoc.students.some((s) => s.toString() === studentId.toString());
  if (!isMember) {
    throw ApiError.forbidden('You must be enrolled in this class to vote on its polls');
  }

  const optionExists = poll.options.some((opt) => opt._id.toString() === optionId);
  if (!optionExists) {
    throw ApiError.badRequest('Selected option does not belong to this poll');
  }

  const alreadyVoted = await Vote.findOne({ pollId, studentId });
  if (alreadyVoted) {
    throw ApiError.conflict('You have already voted on this poll');
  }

  try {
    const vote = await Vote.create({ pollId, studentId, selectedOption: optionId });
    await pushLiveTally(poll);
    return vote;
  } catch (err) {
    // Race-condition fallback: two near-simultaneous requests both passed
    // the findOne check above, but the DB's unique index rejects the second.
    if (err.code === 11000) {
      throw ApiError.conflict('You have already voted on this poll');
    }
    throw err;
  }
};

/**
 * Recomputes and broadcasts the current vote tally for a poll to everyone
 * watching its results screen. Kept private to this module — callers just
 * call castVote() and the push happens automatically on success.
 */
const pushLiveTally = async (poll) => {
  const tally = await Vote.aggregate([
    { $match: { pollId: poll._id } },
    { $group: { _id: '$selectedOption', count: { $sum: 1 } } },
  ]);

  const countsByOption = Object.fromEntries(tally.map((t) => [t._id.toString(), t.count]));
  const totalVotes = tally.reduce((sum, t) => sum + t.count, 0);

  const results = poll.options.map((opt) => ({
    optionId: opt._id.toString(),
    text: opt.text,
    votes: countsByOption[opt._id.toString()] || 0,
  }));

  emitVoteUpdate(poll._id, { results, totalVotes });
};

/**
 * Returns the requesting student's own vote on a poll, if any — used by
 * the frontend to show "you voted for X" instead of the ballot again.
 */
export const getMyVote = async (studentId, pollId) => {
  const vote = await Vote.findOne({ pollId, studentId });
  return vote; // null if the student hasn't voted yet
};

/**
 * Returns the total number of votes cast on a poll, without exposing the
 * per-option breakdown — used sparingly if a UI ever needs just a count.
 */
export const getVoteCount = async (pollId) => Vote.countDocuments({ pollId });
