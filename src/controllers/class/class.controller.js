import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as classService from '../../services/class.service.js';

/**
 * POST /api/classes  (teacher)
 */
export const createClass = asyncHandler(async (req, res) => {
  const { className, description } = req.body;
  const newClass = await classService.createClass({
    teacherId: req.user._id,
    className,
    description,
  });

  return new ApiResponse(201, 'Class created successfully', { class: newClass }).send(res);
});

/**
 * GET /api/classes/teacher/my  (teacher)
 */
export const getMyTeacherClasses = asyncHandler(async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  const classes = await classService.getTeacherClasses(req.user._id, { includeArchived });

  return new ApiResponse(200, 'Classes fetched successfully', { classes }).send(res);
});

/**
 * GET /api/classes/student/my  (student)
 */
export const getMyStudentClasses = asyncHandler(async (req, res) => {
  const classes = await classService.getStudentClasses(req.user._id);

  return new ApiResponse(200, 'Joined classes fetched successfully', { classes }).send(res);
});

/**
 * GET /api/classes/:id  (owning teacher, member student, or admin)
 */
export const getClassById = asyncHandler(async (req, res) => {
  const classDoc = await classService.getClassById(req.params.id, req.user);

  return new ApiResponse(200, 'Class fetched successfully', { class: classDoc }).send(res);
});

/**
 * PATCH /api/classes/:id  (owning teacher or admin)
 */
export const updateClass = asyncHandler(async (req, res) => {
  const classDoc = await classService.updateClass(req.params.id, req.user, req.body);

  return new ApiResponse(200, 'Class updated successfully', { class: classDoc }).send(res);
});

/**
 * DELETE /api/classes/:id  (owning teacher or admin) — soft delete (archive)
 */
export const archiveClass = asyncHandler(async (req, res) => {
  await classService.archiveClass(req.params.id, req.user);

  return new ApiResponse(200, 'Class archived successfully').send(res);
});

/**
 * POST /api/classes/:id/regenerate-code  (owning teacher or admin)
 */
export const regenerateJoinCode = asyncHandler(async (req, res) => {
  const classDoc = await classService.regenerateJoinCode(req.params.id, req.user);

  return new ApiResponse(200, 'Join code regenerated successfully', {
    classCode: classDoc.classCode,
  }).send(res);
});

/**
 * POST /api/classes/join  (student)
 */
export const joinClass = asyncHandler(async (req, res) => {
  const { classCode } = req.body;
  const classDoc = await classService.joinClassByCode(req.user._id, classCode);

  return new ApiResponse(200, 'Joined class successfully', { class: classDoc }).send(res);
});

/**
 * DELETE /api/classes/:id/students/:studentId  (owning teacher or admin)
 */
export const removeStudent = asyncHandler(async (req, res) => {
  const classDoc = await classService.removeStudent(req.params.id, req.params.studentId, req.user);

  return new ApiResponse(200, 'Student removed from class', { class: classDoc }).send(res);
});
