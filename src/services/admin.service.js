import mongoose from 'mongoose';
import User from '../models/User.js';
import Class from '../models/Class.js';
import Poll from '../models/Poll.js';
import Vote from '../models/Vote.js';
import Question from '../models/Question.js';
import ApiError from '../utils/ApiError.js';
import { escapeRegex } from '../utils/sanitize.js';

/**
 * High-level counts for the admin dashboard's summary cards.
 */
export const getDashboardOverview = async () => {
  const [totalStudents, totalTeachers, totalClasses, activeClasses, totalPolls, livePolls, totalVotes, totalQuestions, pendingQuestions] =
    await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      Class.countDocuments(),
      Class.countDocuments({ isArchived: false }),
      Poll.countDocuments(),
      Poll.countDocuments({ status: 'live' }),
      Vote.countDocuments(),
      Question.countDocuments(),
      Question.countDocuments({ status: 'pending' }),
    ]);

  return {
    totalStudents,
    totalTeachers,
    totalClasses,
    activeClasses,
    totalPolls,
    livePolls,
    totalVotes,
    totalQuestions,
    pendingQuestions,
  };
};

/**
 * Lists users (students and/or teachers, optionally admins), with search
 * by name/email and pagination. Used by the "Manage Teachers" / "Manage
 * Students" admin screens, which both point at this one endpoint filtered
 * by `role`.
 */
export const getUsers = async ({ role, search, page = 1, limit = 20 } = {}) => {
  const filter = {};
  if (role) filter.role = role;
  if (search && typeof search === 'string') {
    const sanitized = escapeRegex(search.trim().slice(0, 100));
    if (sanitized) {
      filter.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } },
      ];
    }
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map((u) => u.toSafeJSON()),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

/**
 * Fetches a single user by id.
 */
export const getUserById = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw ApiError.badRequest('Invalid user id');
  }

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  return user.toSafeJSON();
};

/**
 * Updates a user's name and/or active status. Deliberately narrow — an
 * admin cannot change someone's email, password, or role through this
 * endpoint, only their display name and whether their account is active.
 * Admin accounts themselves cannot be edited or deactivated here, since
 * the spec defines a single, manually-seeded admin.
 */
export const updateUser = async (userId, updates) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (user.role === 'admin') {
    throw ApiError.forbidden('Admin accounts cannot be modified through this endpoint');
  }

  if (updates.name !== undefined) user.name = updates.name;
  if (updates.isActive !== undefined) user.isActive = updates.isActive;

  await user.save();
  return user.toSafeJSON();
};

/**
 * Permanently deletes a student or teacher account. Admin accounts are
 * protected from deletion through this endpoint for the same reason they
 * can't be edited above.
 */
export const deleteUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (user.role === 'admin') {
    throw ApiError.forbidden('Admin accounts cannot be deleted through this endpoint');
  }

  await user.deleteOne();
};

/**
 * Lists every class in the system (not scoped to one teacher), with the
 * owning teacher populated and a student count, for the "Manage Classes"
 * admin screen.
 */
export const getAllClasses = async ({ search, page = 1, limit = 20 } = {}) => {
  const filter = {};
  if (search && typeof search === 'string') {
    const sanitized = escapeRegex(search.trim().slice(0, 100));
    if (sanitized) {
      filter.$or = [
        { className: { $regex: sanitized, $options: 'i' } },
        { classCode: { $regex: sanitized, $options: 'i' } },
      ];
    }
  }

  const skip = (page - 1) * limit;

  const [classes, total] = await Promise.all([
    Class.find(filter)
      .populate('teacherId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Class.countDocuments(filter),
  ]);

  return {
    classes: classes.map((c) => ({ ...c, studentCount: c.students?.length || 0 })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

/**
 * Full inspection view of a single class, for the admin's "enter any class"
 * screen. Unlike everything on the teacher side, this deliberately DOES
 * include which student cast which vote and asked which question — the
 * admin is the one role in the system explicitly allowed to see that
 * (per spec: misuse investigation and moderation), so this is the only
 * function in the codebase that joins Vote -> studentId identity.
 * Every other poll-results path (poll.service.getPollResults, used by
 * both teachers and students) stays option-level aggregate only.
 */
export const getClassDetail = async (classId) => {
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    throw ApiError.badRequest('Invalid class id');
  }

  const classDoc = await Class.findById(classId)
    .populate('teacherId', 'name email isActive')
    .populate('students', 'name email isActive')
    .lean();

  if (!classDoc) throw ApiError.notFound('Class not found');

  const polls = await Poll.find({ classId }).sort({ createdAt: -1 }).lean();
  const pollIds = polls.map((p) => p._id);

  const [votes, questions] = await Promise.all([
    Vote.find({ pollId: { $in: pollIds } })
      .populate('studentId', 'name email')
      .lean(),
    Question.find({ classId })
      .populate('studentId', 'name email')
      .populate('answeredBy', 'name')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const votesByPoll = new Map();
  for (const vote of votes) {
    if (!votesByPoll.has(vote.pollId.toString())) votesByPoll.set(vote.pollId.toString(), []);
    votesByPoll.get(vote.pollId.toString()).push(vote);
  }

  const pollsWithResponses = polls.map((poll) => {
    const pollVotes = votesByPoll.get(poll._id.toString()) || [];
    const optionsById = Object.fromEntries(poll.options.map((o) => [o._id.toString(), o.text]));

    return {
      ...poll,
      totalVotes: pollVotes.length,
      responses: pollVotes.map((v) => ({
        student: v.studentId, // { _id, name, email } — identified, admin-only
        selectedOptionText: optionsById[v.selectedOption.toString()] || 'Unknown option',
        votedAt: v.votedAt,
      })),
    };
  });

  return {
    class: { ...classDoc, studentCount: classDoc.students?.length || 0 },
    polls: pollsWithResponses,
    questions,
  };
};

/**
 * A single student's full activity across the platform — every vote they've
 * cast (with the poll question and class it belongs to) and every question
 * they've asked. Used by the admin's "View Activity" action for moderation;
 * this is intentionally identity-linked, unlike anything teacher-facing.
 */
export const getUserActivity = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw ApiError.badRequest('Invalid user id');
  }

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (user.role !== 'student') {
    return { user: user.toSafeJSON(), votes: [], questions: [] };
  }

  const votes = await Vote.find({ studentId: userId }).sort({ votedAt: -1 }).lean();
  const pollIds = votes.map((v) => v.pollId);

  const [polls, questions] = await Promise.all([
    Poll.find({ _id: { $in: pollIds } })
      .populate('classId', 'className')
      .lean(),
    Question.find({ studentId: userId })
      .populate('classId', 'className')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const pollsById = Object.fromEntries(polls.map((p) => [p._id.toString(), p]));

  const votesWithContext = votes.map((v) => {
    const poll = pollsById[v.pollId.toString()];
    const optionText = poll?.options.find((o) => o._id.toString() === v.selectedOption.toString())?.text;
    return {
      pollId: v.pollId,
      question: poll?.question || 'Poll no longer exists',
      className: poll?.classId?.className || 'Unknown class',
      selectedOptionText: optionText || 'Unknown option',
      votedAt: v.votedAt,
    };
  });

  return {
    user: user.toSafeJSON(),
    votes: votesWithContext,
    questions,
  };
};

/**
 * Aggregated platform analytics for the admin analytics screen:
 * breakdowns by role/status, a 14-day new-user signup trend, and the
 * top 5 most-enrolled classes.
 */
export const getAnalytics = async () => {
  const [usersByRoleRaw, pollsByStatusRaw, questionsByStatusRaw, dailySignupsRaw, topClassesRaw] =
    await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Poll.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Question.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Class.aggregate([
        { $match: { isArchived: false } },
        { $project: { className: 1, classCode: 1, studentCount: { $size: '$students' } } },
        { $sort: { studentCount: -1 } },
        { $limit: 5 },
      ]),
    ]);

  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));

  return {
    usersByRole: toMap(usersByRoleRaw),
    pollsByStatus: toMap(pollsByStatusRaw),
    questionsByStatus: toMap(questionsByStatusRaw),
    dailySignups: dailySignupsRaw.map((r) => ({ date: r._id, count: r.count })),
    topClasses: topClassesRaw,
  };
};
