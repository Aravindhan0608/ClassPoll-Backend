import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as voteService from '../../services/vote.service.js';

/**
 * POST /api/votes  (student)
 */
export const castVote = asyncHandler(async (req, res) => {
  const { pollId, optionId } = req.body;
  const vote = await voteService.castVote(req.user._id, { pollId, optionId });

  return new ApiResponse(201, 'Vote cast successfully', { vote }).send(res);
});

/**
 * GET /api/votes/my/:pollId  (student)
 */
export const getMyVote = asyncHandler(async (req, res) => {
  const vote = await voteService.getMyVote(req.user._id, req.params.pollId);

  return new ApiResponse(200, 'Vote status fetched', {
    hasVoted: Boolean(vote),
    vote: vote || null,
  }).send(res);
});
