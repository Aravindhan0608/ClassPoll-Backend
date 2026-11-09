import mongoose from 'mongoose';
import Class from '../models/Class.js';
import ApiError from '../utils/ApiError.js';

/**
 * Creates a new class owned by the given teacher, generating a unique,
 * collision-checked join code.
 */
export const createClass = async ({ teacherId, className, description }) => {
  const classCode = await Class.generateUniqueClassCode();

  const newClass = await Class.create({
    className,
    description: description || '',
    classCode,
    teacherId,
    students: [],
  });

  return newClass;
};

/**
 * Returns all (non-archived by default) classes owned by a teacher,
 * most recently created first, with a lightweight student count.
 */
export const getTeacherClasses = async (teacherId, { includeArchived = false } = {}) => {
  const filter = { teacherId };
  if (!includeArchived) filter.isArchived = false;

  const classes = await Class.find(filter).sort({ createdAt: -1 }).lean();

  return classes.map((c) => ({ ...c, studentCount: c.students?.length || 0 }));
};

/**
 * Returns all classes a student has joined.
 */
export const getStudentClasses = async (studentId) => {
  const classes = await Class.find({ students: studentId, isArchived: false })
    .populate('teacherId', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  return classes.map((c) => ({ ...c, studentCount: c.students?.length || 0 }));
};

/**
 * Fetches a single class by id, enforcing that the requester is either
 * the owning teacher, a member student, or an admin.
 */
export const getClassById = async (classId, requester) => {
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    throw ApiError.badRequest('Invalid class id');
  }

  const query = Class.findById(classId).populate('teacherId', 'name email');
  if (requester.role === 'admin') {
    query.populate('students', 'name email');
  }

  const classDoc = await query;

  if (!classDoc) {
    throw ApiError.notFound('Class not found');
  }

  assertClassAccess(classDoc, requester);

  if (requester.role !== 'admin') {
    const safeObj = classDoc.toObject();
    safeObj.studentCount = classDoc.students?.length || 0;
    // Anonymize students array to preserve .length while withholding all student IDs and personal data
    safeObj.students = new Array(safeObj.studentCount).fill(null);
    return safeObj;
  }

  return classDoc;
};

/**
 * Updates class metadata. Only the owning teacher (or admin) may update.
 */
export const updateClass = async (classId, requester, updates) => {
  const classDoc = await Class.findById(classId);

  if (!classDoc) {
    throw ApiError.notFound('Class not found');
  }

  assertTeacherOwnership(classDoc, requester);

  if (updates.className !== undefined) classDoc.className = updates.className;
  if (updates.description !== undefined) classDoc.description = updates.description;

  await classDoc.save();
  return classDoc;
};

/**
 * Archives (soft-deletes) a class instead of hard-deleting it, preserving
 * historical polls/questions/votes tied to it for records and analytics.
 */
export const archiveClass = async (classId, requester) => {
  const classDoc = await Class.findById(classId);

  if (!classDoc) {
    throw ApiError.notFound('Class not found');
  }

  assertTeacherOwnership(classDoc, requester);

  classDoc.isArchived = true;
  await classDoc.save();
  return classDoc;
};

/**
 * Regenerates a class's join code, invalidating the old one immediately.
 * Useful if a code has been shared too widely.
 */
export const regenerateJoinCode = async (classId, requester) => {
  const classDoc = await Class.findById(classId);

  if (!classDoc) {
    throw ApiError.notFound('Class not found');
  }

  assertTeacherOwnership(classDoc, requester);

  classDoc.classCode = await Class.generateUniqueClassCode();
  await classDoc.save();
  return classDoc;
};

/**
 * Lets a student join a class via its 6-character join code.
 */
export const joinClassByCode = async (studentId, classCode) => {
  const classDoc = await Class.findOne({ classCode: classCode.toUpperCase(), isArchived: false });

  if (!classDoc) {
    throw ApiError.notFound('No active class found with this join code');
  }

  const alreadyMember = classDoc.students.some((s) => s.toString() === studentId.toString());
  if (alreadyMember) {
    throw ApiError.conflict('You have already joined this class');
  }

  classDoc.students.push(studentId);
  await classDoc.save();

  return classDoc;
};

/**
 * Removes a student from a class. Only the owning teacher (or admin) may do this.
 */
export const removeStudent = async (classId, studentId, requester) => {
  const classDoc = await Class.findById(classId);

  if (!classDoc) {
    throw ApiError.notFound('Class not found');
  }

  assertTeacherOwnership(classDoc, requester);

  const isMember = classDoc.students.some((s) => s.toString() === studentId.toString());
  if (!isMember) {
    throw ApiError.badRequest('Student is not a member of this class');
  }

  classDoc.students = classDoc.students.filter((s) => s.toString() !== studentId.toString());
  await classDoc.save();

  return classDoc;
};

// --- Authorization helpers (kept local to this service; controllers stay thin) ---

const assertTeacherOwnership = (classDoc, requester) => {
  const isOwner = classDoc.teacherId.toString() === requester._id.toString();
  const isAdmin = requester.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to manage this class');
  }
};

const assertClassAccess = (classDoc, requester) => {
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

export const _testables = { assertTeacherOwnership, assertClassAccess };
