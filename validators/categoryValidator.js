const { body } = require('express-validator');

const createCategoryValidator = [
  body('name')
    .notEmpty().withMessage('Category name is required')
    .isLength({ max: 50 }).withMessage('Category name cannot exceed 50 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters')
];

const updateCategoryValidator = [
  body('name')
    .optional()
    .isLength({ max: 50 }).withMessage('Category name cannot exceed 50 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters')
];

module.exports = {
  createCategoryValidator,
  updateCategoryValidator
};