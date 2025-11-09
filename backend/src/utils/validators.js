const { body, param, query, validationResult } = require('express-validator');

// Validation middleware executor
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// Common validators
const validators = {
  // User validators
  createUser: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('employeeId').trim().notEmpty().withMessage('Employee ID is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(['admin', 'compliance_manager', 'reviewer', 'manager', 'user'])
      .withMessage('Invalid role'),
    validate,
  ],

  updateUser: [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('email').optional().isEmail().normalizeEmail(),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('status').optional().isIn(['active', 'inactive', 'terminated', 'suspended']),
    validate,
  ],

  // Login validator
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],

  // Campaign validators
  createCampaign: [
    body('name').trim().notEmpty().withMessage('Campaign name is required'),
    body('campaignType').isIn(['manager_review', 'application_owner', 'both', 'ad_hoc'])
      .withMessage('Invalid campaign type'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    body('scopeConfig').isObject().withMessage('Scope configuration is required'),
    validate,
  ],

  // Review decision validator
  reviewDecision: [
    param('id').isUUID().withMessage('Invalid review item ID'),
    body('decision').isIn(['approved', 'revoked', 'exception', 'delegated'])
      .withMessage('Invalid decision'),
    body('rationale').optional().trim(),
    validate,
  ],

  // Application validator
  createApplication: [
    body('name').trim().notEmpty().withMessage('Application name is required'),
    body('code').trim().notEmpty().withMessage('Application code is required'),
    body('applicationType').trim().notEmpty().withMessage('Application type is required'),
    body('businessCriticality').optional().isIn(['critical', 'high', 'medium', 'low']),
    validate,
  ],

  // UUID param validator
  uuidParam: [
    param('id').isUUID().withMessage('Invalid ID format'),
    validate,
  ],

  // Pagination validator
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate,
  ],
};

module.exports = validators;