import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as pollService from '../../services/poll.service.js';

/**
 * POST /api/polls  (teacher)
 */
export const createPoll = asyncHandler(async (req, res) => {
  const { classId, question, options, allowResult } = req.body;
  const poll = await pollService.createPoll(req.user, { classId, question, options, allowResult });

  return new ApiResponse(201, 'Poll created successfully', { poll }).send(res);
});

/**
 * POST /api/polls/:id/start  (teacher)
 * Broadcasts `poll:started` to the class room in real time via Socket.io.
 */
export const startPoll = asyncHandler(async (req, res) => {
  const poll = await pollService.startPoll(req.params.id, req.user);

  return new ApiResponse(200, 'Poll started successfully', { poll }).send(res);
});

/**
 * POST /api/polls/:id/end  (teacher)
 * Broadcasts `poll:ended` to both the class room and the poll's own room.
 */
export const endPoll = asyncHandler(async (req, res) => {
  const poll = await pollService.endPoll(req.params.id, req.user);

  return new ApiResponse(200, 'Poll ended successfully', { poll }).send(res);
});

/**
 * PATCH /api/polls/:id  (teacher, draft polls only)
 */
export const updatePoll = asyncHandler(async (req, res) => {
  const poll = await pollService.updatePoll(req.params.id, req.user, req.body);

  return new ApiResponse(200, 'Poll updated successfully', { poll }).send(res);
});

/**
 * DELETE /api/polls/:id  (teacher, draft polls only)
 */
export const deletePoll = asyncHandler(async (req, res) => {
  await pollService.deletePoll(req.params.id, req.user);

  return new ApiResponse(200, 'Poll deleted successfully').send(res);
});

/**
 * GET /api/polls/class/:classId  (teacher/member student/admin)
 */
export const getPollsForClass = asyncHandler(async (req, res) => {
  const polls = await pollService.getPollsForClass(req.params.classId, req.user);

  return new ApiResponse(200, 'Polls fetched successfully', { polls }).send(res);
});

/**
 * GET /api/polls/class/:classId/active  (teacher/member student/admin)
 */
export const getActivePoll = asyncHandler(async (req, res) => {
  const poll = await pollService.getActivePoll(req.params.classId, req.user);

  return new ApiResponse(200, 'Active poll fetched successfully', { poll }).send(res);
});

/**
 * GET /api/polls/:id  (teacher/member student/admin)
 */
export const getPollById = asyncHandler(async (req, res) => {
  const poll = await pollService.getPollById(req.params.id, req.user);

  return new ApiResponse(200, 'Poll fetched successfully', { poll }).send(res);
});

/**
 * GET /api/polls/:id/results  (teacher/admin always; student only if allowResult)
 */
export const getPollResults = asyncHandler(async (req, res) => {
  const { poll, results, totalVotes } = await pollService.getPollResults(req.params.id, req.user);

  return new ApiResponse(200, 'Poll results fetched successfully', {
    pollId: poll._id,
    question: poll.question,
    status: poll.status,
    totalVotes,
    results,
  }).send(res);
});
