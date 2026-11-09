import mongoose from 'mongoose';
import Question from '../models/Question.js';
import Class from '../models/Class.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import { emitNewQuestion, emitQuestionAnswered } from './socket.service.js';

/**
 * Student asks a question in a class they're enrolled in.
 * Notifies the class's teacher immediately (a lightweight Notification
 * document here; Phase 8 adds the full read/unread API on top of it, and
 * Phase 7's Socket.io layer will push this in real time instead of the
 * student needing to refresh).
 */
export const askQuestion = async (studentId, { classId, question }) => {
  const classDoc = await Class.findById(classId);
  if (!classDoc) throw ApiError.notFound('Class not found');

  const isMember = classDoc.students.some((s) => s.toString() === studentId.toString());
  if (!isMember) {
    throw ApiError.forbidden('You must be enrolled in this class to ask a question');
  }

  const newQuestion = await Question.create({
    classId,
    studentId,
    question,
    status: 'pending',
  });

  await Notification.create({
    userId: classDoc.teacherId,
    title: 'New question',
    message: `A student asked a question in "${classDoc.className}"`,
    type: 'question',
  });

  const safeQuestionForTeacher = newQuestion.toObject();
  safeQuestionForTeacher.studentId = null;
  emitNewQuestion(classDoc.teacherId, safeQuestionForTeacher);

  return newQuestion;
};

/**
 * Teacher answers a pending (or previously answered) question.
 * Notifies the asking student that a reply is ready.
 */
export const answerQuestion = async (questionId, requester, answerText) => {
  const question = await Question.findById(questionId);
  if (!question) throw ApiError.notFound('Question not found');

  const classDoc = await Class.findById(question.classId);
  assertTeacherOwnsClass(classDoc, requester);

  question.answer = answerText;
  question.answeredBy = requester._id;
  question.status = 'answered';
  await question.save();

  await Notification.create({
    userId: question.studentId,
    title: 'Your question was answered',
    message: `Your teacher replied to your question in "${classDoc.className}"`,
    type: 'question',
  });

  emitQuestionAnswered(question.studentId, question);

  if (requester.role === 'teacher') {
    const safeQuestion = question.toObject();
    safeQuestion.studentId = null;
    return safeQuestion;
  }

  return question;
};

/**
 * Lists questions for a class.
 *   - Teacher/admin: sees every question, optionally filtered by status.
 *   - Student: sees only their own questions in that class.
 */
export const getQuestionsForClass = async (classId, requester, { status } = {}) => {
  const classDoc = await Class.findById(classId);
  if (!classDoc) throw ApiError.notFound('Class not found');

  assertClassAccess(classDoc, requester);

  const filter = { classId };
  if (status) filter.status = status;

  const isTeacherOrAdmin = isOwnerOrAdmin(classDoc, requester);
  if (!isTeacherOrAdmin) {
    filter.studentId = requester._id;
  }

  const query = Question.find(filter).populate('answeredBy', 'name').sort({ createdAt: -1 });

  // Teachers must not be able to identify which student asked a question —
  // this endpoint is shared with the student's own "my questions" view, so
  // identity is withheld here rather than in the model/DB. Admins keep full
  // identified access through their own dedicated endpoint
  // (admin.service.getClassDetail), which this change does not touch.
  if (requester.role !== 'teacher') {
    query.populate('studentId', 'name email');
  }

  const questions = await query;

  if (requester.role === 'teacher') {
    return questions.map((q) => {
      const obj = q.toObject();
      obj.studentId = null; // identity intentionally withheld from teachers
      return obj;
    });
  }

  return questions;
};

/**
 * Fetches a single question, authorized for the asking student, the
 * class's teacher, or an admin.
 */
export const getQuestionById = async (questionId, requester) => {
  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    throw ApiError.badRequest('Invalid question id');
  }

  const query = Question.findById(questionId).populate('answeredBy', 'name');
  if (requester.role !== 'teacher') {
    query.populate('studentId', 'name email');
  }

  const question = await query;
  if (!question) throw ApiError.notFound('Question not found');

  const classDoc = await Class.findById(question.classId);
  const isTeacherOrAdmin = isOwnerOrAdmin(classDoc, requester);
  const askerId = question.studentId?._id?.toString() || question.studentId?.toString();
  const isAsker = askerId === requester._id.toString();

  if (!isTeacherOrAdmin && !isAsker) {
    throw ApiError.forbidden('You do not have access to this question');
  }

  if (requester.role === 'teacher') {
    const obj = question.toObject();
    obj.studentId = null; // identity intentionally withheld from teachers
    return obj;
  }

  return question;
};

// --- Authorization helpers ---

const isOwnerOrAdmin = (classDoc, requester) => {
  const teacherId = classDoc.teacherId?._id?.toString() || classDoc.teacherId.toString();
  return teacherId === requester._id.toString() || requester.role === 'admin';
};

const assertTeacherOwnsClass = (classDoc, requester) => {
  if (!classDoc) throw ApiError.notFound('Class not found');
  if (!isOwnerOrAdmin(classDoc, requester)) {
    throw ApiError.forbidden('You do not have permission to answer questions for this class');
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
