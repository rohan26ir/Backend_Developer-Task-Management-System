const { body, validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    res.status(400).json({
      success: false,
      errors: errors.array()
    });
  };
};

const userValidationRules = () => {
  return [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ];
};

const projectValidationRules = () => {
  return [
    body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Project name must be between 3 and 100 characters'),
    body('key').trim().isLength({ min: 2, max: 10 }).withMessage('Project key must be between 2 and 10 characters'),
    body('description').notEmpty().withMessage('Description is required'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required')
  ];
};

const taskValidationRules = () => {
  return [
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Task title must be between 3 and 200 characters'),
    body('description').notEmpty().withMessage('Description is required'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
    body('project').isMongoId().withMessage('Valid project ID is required')
  ];
};

module.exports = {
  validate,
  userValidationRules,
  projectValidationRules,
  taskValidationRules
};