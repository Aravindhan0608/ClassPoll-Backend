import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const PROFILE_FIELDS = ['rollNumber', 'department', 'year', 'section', 'collegeName'];

/**
 * Returns the requesting student's own profile. Students can only ever
 * reach this for themselves — there is no "get profile by id" for another
 * user's studentProfile, by design, since that data is personally
 * identifying and teachers/other students must never be able to fetch it.
 */
export const getMyProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  return {
    studentProfile: user.studentProfile || {},
    isComplete: PROFILE_FIELDS.every((f) => Boolean(user.studentProfile?.[f])),
  };
};

/**
 * Creates or updates the requesting student's own profile (upsert — a
 * student always has at most one profile, and resubmitting just updates it).
 * Roll number uniqueness is enforced by the DB's sparse unique index; a
 * duplicate is caught here and turned into a clean, actionable message.
 */
export const upsertMyProfile = async (userId, payload) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (user.role !== 'student') {
    throw ApiError.forbidden('Only student accounts have a student profile');
  }

  const updates = {};
  for (const field of PROFILE_FIELDS) {
    if (payload[field] !== undefined) updates[`studentProfile.${field}`] = payload[field];
  }

  try {
    const updated = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true });
    return updated.studentProfile;
  } catch (err) {
    if (err.code === 11000) {
      throw ApiError.conflict('That roll number is already registered to another student');
    }
    throw err;
  }
};
