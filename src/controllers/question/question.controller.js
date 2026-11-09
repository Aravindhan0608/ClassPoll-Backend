import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as questionService from '../../services/question.service.js';

/**
 * POST /api/questions  (student)
 */
export const askQuestion = asyncHandler(async (req, res) => {
  const { classId, question } = req.body;
  const newQuestion = await questionService.askQuestion(req.user._id, { classId, question });

  return new ApiResponse(201, 'Question submitted successfully', { question: newQuestion }).send(res);
});

/**
 * PATCH /api/questions/:id/answer  (teacher)
 * Creates a Notification document and pushes `question:answered` +
 * `notification:new` to the student's personal socket room in real time.
 */
export const answerQuestion = asyncHandler(async (req, res) => {
  const { answer } = req.body;
  const question = await questionService.answerQuestion(req.params.id, req.user, answer);

  return new ApiResponse(200, 'Question answered successfully', { question }).send(res);
});

/**
 * GET /api/questions/class/:classId  (owner / member / admin)
 * Optional ?status=pending|answered query filter.
 */
export const getQuestionsForClass = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const questions = await questionService.getQuestionsForClass(req.params.classId, req.user, {
    status,
  });

  return new ApiResponse(200, 'Questions fetched successfully', { questions }).send(res);
});

/**
 * GET /api/questions/:id  (asking student / class teacher / admin)
 */
export const getQuestionById = asyncHandler(async (req, res) => {
  const question = await questionService.getQuestionById(req.params.id, req.user);

  return new ApiResponse(200, 'Question fetched successfully', { question }).send(res);
});
