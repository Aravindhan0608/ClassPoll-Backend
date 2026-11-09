import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as adminService from '../../services/admin.service.js';
import * as classService from '../../services/class.service.js';

/**
 * GET /api/admin/dashboard
 */
export const getDashboardOverview = asyncHandler(async (req, res) => {
  const overview = await adminService.getDashboardOverview();

  return new ApiResponse(200, 'Dashboard overview fetched successfully', overview).send(res);
});

/**
 * GET /api/admin/users?role=&search=&page=&limit=
 * Backs both "Manage Teachers" and "Manage Students" screens (filter by role).
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { role, search, page, limit } = req.query;
  const { users, pagination } = await adminService.getUsers({ role, search, page, limit });

  return new ApiResponse(200, 'Users fetched successfully', { users, pagination }).send(res);
});

/**
 * GET /api/admin/users/:id
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await adminService.getUserById(req.params.id);

  return new ApiResponse(200, 'User fetched successfully', { user }).send(res);
});

/**
 * PATCH /api/admin/users/:id
 * Narrow update: name and/or isActive only.
 */
export const updateUser = asyncHandler(async (req, res) => {
  const user = await adminService.updateUser(req.params.id, req.body);

  return new ApiResponse(200, 'User updated successfully', { user }).send(res);
});

/**
 * DELETE /api/admin/users/:id
 */
export const deleteUser = asyncHandler(async (req, res) => {
  await adminService.deleteUser(req.params.id);

  return new ApiResponse(200, 'User deleted successfully').send(res);
});

/**
 * GET /api/admin/classes?search=&page=&limit=
 */
export const getAllClasses = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const { classes, pagination } = await adminService.getAllClasses({ search, page, limit });

  return new ApiResponse(200, 'Classes fetched successfully', { classes, pagination }).send(res);
});

/**
 * DELETE /api/admin/classes/:id
 * Reuses the Class Module's own archive logic (which already permits
 * admins), so archiving behavior stays identical everywhere it happens.
 */
export const archiveClass = asyncHandler(async (req, res) => {
  await classService.archiveClass(req.params.id, req.user);

  return new ApiResponse(200, 'Class archived successfully').send(res);
});

/**
 * GET /api/admin/classes/:id
 * Full inspection view: teacher, students, every poll with identified
 * responses, and every question — the one place in the system where an
 * admin can see which specific student cast which vote, for moderation.
 */
export const getClassDetail = asyncHandler(async (req, res) => {
  const detail = await adminService.getClassDetail(req.params.id);

  return new ApiResponse(200, 'Class detail fetched successfully', detail).send(res);
});

/**
 * GET /api/admin/users/:id/activity
 * A student's full platform activity (votes with poll/class context,
 * questions asked) for the admin's "View Activity" moderation action.
 */
export const getUserActivity = asyncHandler(async (req, res) => {
  const activity = await adminService.getUserActivity(req.params.id);

  return new ApiResponse(200, 'User activity fetched successfully', activity).send(res);
});

/**
 * GET /api/admin/analytics
 */
export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await adminService.getAnalytics();

  return new ApiResponse(200, 'Analytics fetched successfully', analytics).send(res);
});
