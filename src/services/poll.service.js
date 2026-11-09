import mongoose from 'mongoose';
import Poll from '../models/Poll.js';
import Class from '../models/Class.js';
import Vote from '../models/Vote.js';
import ApiError from '../utils/ApiError.js';
import { emitPollStarted, emitPollEnded } from './socket.service.js';

/**
 * Creates a poll in `draft` status under a class. Drafts are invisible to
 * students until the teacher explicitly starts them.
 */
export const createPoll = async (requester, { classId, question, options, allowResult }) => {
  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    throw ApiError.notFound('Class not found');
  }

  assertTeacherOwnsClass(classDoc, requester._id, requester.role);

  const poll = await Poll.create({
    classId,
    question,
    options: options.map((text) => ({ text })),
    allowResult: allowResult ?? true,
    status: 'draft',
    createdBy: requester._id,
  });

  return poll;
};

/**
 * Starts a draft (or previously ended) poll, making it live for students.
 * Ends any other currently-live poll in the same class first, since only
 * one poll should be active per class at a time.
 */
export const startPoll = async (pollId, requester) => {
  const poll = await Poll.findById(pollId);
  if (!poll) throw ApiError.notFound('Poll not found');

  const classDoc = await Class.findById(poll.classId);
  assertTeacherOwnsClass(classDoc, requester._id, requester.role);

  if (poll.status === 'live') {
    throw ApiError.conflict('This poll is already live');
  }

  await Poll.updateMany(
    { classId: poll.classId, status: 'live', _id: { $ne: poll._id } },
    { $set: { status: 'ended', endTime: new Date() } }
  );

  poll.status = 'live';
  poll.startTime = new Date();
  poll.endTime = null;
  await poll.save();

  emitPollStarted(poll.classId, poll);

  return poll;
};

/**
 * Ends a live poll and locks in its final result.
 */
export const endPoll = async (pollId, requester) => {
  const poll = await Poll.findById(pollId);
  if (!poll) throw ApiError.notFound('Poll not found');

  const classDoc = await Class.findById(poll.classId);
  assertTeacherOwnsClass(classDoc, requester._id, requester.role);

  if (poll.status !== 'live') {
    throw ApiError.badRequest('Only a live poll can be ended');
  }

  poll.status = 'ended';
  poll.endTime = new Date();
  await poll.save();

  emitPollEnded(poll.classId, poll);

  return poll;
};

/**
 * Updates a poll's question/options/allowResult flag. Only permitted while
 * the poll is still a draft — once live or ended, its shape should not
 * change underneath students who may have already voted.
 */
export const updatePoll = async (pollId, requester, updates) => {
  const poll = await Poll.findById(pollId);
  if (!poll) throw ApiError.notFound('Poll not found');

  const classDoc = await Class.findById(poll.classId);
  assertTeacherOwnsClass(classDoc, requester._id, requester.role);

  if (poll.status !== 'draft') {
    throw ApiError.badRequest('Only a draft poll can be edited');
  }

  if (updates.question !== undefined) poll.question = updates.question;
  if (updates.options !== undefined) poll.options = updates.options.map((text) => ({ text }));
  if (updates.allowResult !== undefined) poll.allowResult = updates.allowResult;

  await poll.save();
  return poll;
};

/**
 * Deletes a poll. Only permitted while still a draft, since a live/ended
 * poll may already have votes attached.
 */
export const deletePoll = async (pollId, requester) => {
  const poll = await Poll.findById(pollId);
  if (!poll) throw ApiError.notFound('Poll not found');

  const classDoc = await Class.findById(poll.classId);
  assertTeacherOwnsClass(classDoc, requester._id, requester.role);

  if (poll.status !== 'draft') {
    throw ApiError.badRequest('Only a draft poll can be deleted. Consider ending it instead.');
  }

  await poll.deleteOne();
};

/**
 * Checks if a live poll has expired based on its endTime.
 * If expired, updates status to 'ended', persists to DB, and broadcasts emitPollEnded.
 * Returns true if expired, false otherwise.
 */
export const checkAndExpirePoll = async (poll) => {
  if (!poll || poll.status !== 'live') return false;
  if (poll.endTime && new Date(poll.endTime).getTime() <= Date.now()) {
    poll.status = 'ended';
    await poll.save();
    try {
      emitPollEnded(poll.classId, poll);
    } catch {
      // Socket broadcast failure should not interrupt DB state consistency
    }
    return true;
  }
  return false;
};

/**
 * Lists polls for a class. Students only ever see live/ended polls
 * (never another teacher's drafts); teachers/admins see everything.
 */
export const getPollsForClass = async (classId, requester) => {
  const classDoc = await Class.findById(classId);
  if (!classDoc) throw ApiError.notFound('Class not found');

  assertClassAccess(classDoc, requester);

  const isTeacherOrAdmin = isOwnerOrAdmin(classDoc, requester);
  const filter = { classId };
  if (!isTeacherOrAdmin) filter.status = { $in: ['live', 'ended'] };

  const polls = await Poll.find(filter).sort({ createdAt: -1 });
  for (const poll of polls) {
    await checkAndExpirePoll(poll);
  }

  return polls;
};

/**
 * Returns the single currently-live poll for a class, if any.
 */
export const getActivePoll = async (classId, requester) => {
  const classDoc = await Class.findById(classId);
  if (!classDoc) throw ApiError.notFound('Class not found');

  assertClassAccess(classDoc, requester);

  const poll = await Poll.findOne({ classId, status: 'live' });
  if (!poll) throw ApiError.notFound('No active poll for this class right now');

  const isExpired = await checkAndExpirePoll(poll);
  if (isExpired) {
    throw ApiError.notFound('No active poll for this class right now');
  }

  return poll;
};

/**
 * Fetches a single poll by id with authorization: the class's teacher,
 * an enrolled student, or an admin. Students cannot see draft polls.
 */
export const getPollById = async (pollId, requester) => {
  if (!mongoose.Types.ObjectId.isValid(pollId)) {
    throw ApiError.badRequest('Invalid poll id');
  }

  const poll = await Poll.findById(pollId);
  if (!poll) throw ApiError.notFound('Poll not found');

  await checkAndExpirePoll(poll);

  const classDoc = await Class.findById(poll.classId);
  assertClassAccess(classDoc, requester);

  const isTeacherOrAdmin = isOwnerOrAdmin(classDoc, requester);
  if (poll.status === 'draft' && !isTeacherOrAdmin) {
    throw ApiError.notFound('Poll not found');
  }

  return poll;
};

/**
 * Aggregates vote counts per option for a poll.
 * Visibility rule: the class's teacher/admin can always see results.
 * A student may see results only if the poll's `allowResult` flag is on.
 */
export const getPollResults = async (pollId, requester) => {
  const poll = await getPollById(pollId, requester);
  const classDoc = await Class.findById(poll.classId);
  const isTeacherOrAdmin = isOwnerOrAdmin(classDoc, requester);

  if (!isTeacherOrAdmin && !poll.allowResult) {
    throw ApiError.forbidden('Results are not visible for this poll yet');
  }

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

  return { poll, results, totalVotes };
};

// --- Authorization helpers ---

const isOwnerOrAdmin = (classDoc, requester) => {
  const teacherId = classDoc.teacherId?._id?.toString() || classDoc.teacherId.toString();
  return teacherId === requester._id.toString() || requester.role === 'admin';
};

const assertTeacherOwnsClass = (classDoc, requesterId, requesterRole) => {
  if (!classDoc) throw ApiError.notFound('Class not found');
  const teacherId = classDoc.teacherId.toString();
  const isOwner = teacherId === requesterId.toString();
  const isAdmin = requesterRole === 'admin';

  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to manage polls for this class');
  }
};

const assertClassAccess = (classDoc, requester) => {
  if (!classDoc) throw ApiError.notFound('Class not found');
  const teacherId = classDoc.teacherId?._id?.toString() || classDoc.teacherId.toString();
  const isOwner = teacherId === requester._id.toString();
  const isAdmin = requester.role === 'admin';
  const isMember = classDoc.students.some((s) => {
    const sid = s?._id?.toString() || s.toString();
    return sid === requester._id.toString();
  });

  if (!isOwner && !isAdmin && !isMember) {
    throw ApiError.forbidden('You do not have access to this class');
  }
};
