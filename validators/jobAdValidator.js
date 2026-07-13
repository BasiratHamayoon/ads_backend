const { body } = require('express-validator');

const createJobAdValidator = [
  body('title')
    .notEmpty().withMessage('Job title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters')
    .trim(),
  body('description')
    .notEmpty().withMessage('Job description is required')
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isMongoId().withMessage('Invalid category ID'),
  body('source.websiteName')
    .notEmpty().withMessage('Source website name is required')
    .trim(),
  body('source.websiteUrl')
    .notEmpty().withMessage('Source website URL is required')
    .isURL().withMessage('Please enter a valid URL'),
  body('company.name')
    .notEmpty().withMessage('Company name is required')
    .trim(),
  body('jobType')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'internship', 'freelance', 'temporary'])
    .withMessage('Invalid job type'),
  body('experienceLevel')
    .optional()
    .isIn(['entry', 'mid', 'senior', 'executive', 'any'])
    .withMessage('Invalid experience level'),
  body('applicationMethod')
    .optional()
    .isIn(['email', 'website', 'phone', 'walk-in', 'online-form', 'other'])
    .withMessage('Invalid application method'),
  body('contactEmail')
    .optional()
    .isEmail().withMessage('Please enter a valid contact email'),
  body('salary.min')
    .optional()
    .isNumeric().withMessage('Minimum salary must be a number'),
  body('salary.max')
    .optional()
    .isNumeric().withMessage('Maximum salary must be a number')
];

const updateJobAdValidator = [
  body('title')
    .optional()
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),
  body('category')
    .optional()
    .isMongoId().withMessage('Invalid category ID'),
  body('jobType')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'internship', 'freelance', 'temporary'])
    .withMessage('Invalid job type'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'expired', 'draft'])
    .withMessage('Invalid status')
];

module.exports = {
  createJobAdValidator,
  updateJobAdValidator
};