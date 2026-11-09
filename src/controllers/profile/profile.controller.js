import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as profileService from '../../services/profile.service.js';

/**
 * GET /api/profile  (student, own profile only)
 */
export const getMyProfile = asyncHandler(async (req, res) => {
  const data = await profileService.getMyProfile(req.user._id);

  return new ApiResponse(200, 'Profile fetched successfully', data).send(res);
});

/**
 * PUT /api/profile  (student, own profile only)
 * Upsert semantics: works for both first-time setup and later edits.
 */
export const upsertMyProfile = asyncHandler(async (req, res) => {
  const studentProfile = await profileService.upsertMyProfile(req.user._id, req.body);

  return new ApiResponse(200, 'Profile saved successfully', { studentProfile }).send(res);
});
