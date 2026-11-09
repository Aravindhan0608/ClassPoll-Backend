import ApiError from '../utils/ApiError.js';

/**
 * Restricts a route to one or more roles. Must run after authMiddleware
 * so that req.user is already populated.
 *
 * Usage: router.post('/classes', authMiddleware, roleMiddleware('teacher'), createClass)
 */
const roleMiddleware =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`Access denied. This action requires role: ${allowedRoles.join(' or ')}.`)
      );
    }

    return next();
  };

export default roleMiddleware;
