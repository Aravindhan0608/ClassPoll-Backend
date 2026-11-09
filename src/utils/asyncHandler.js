/**
 * Wraps an async controller/middleware so any thrown/rejected error is
 * forwarded to next(), letting the centralized error middleware handle it.
 * Keeps controllers free of repetitive try/catch blocks.
 */
const asyncHandler = (requestHandler) => (req, res, next) => {
  Promise.resolve(requestHandler(req, res, next)).catch(next);
};

export default asyncHandler;
