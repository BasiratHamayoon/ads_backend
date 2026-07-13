const { body } = require('express-validator');

const createContactValidator = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters')
    .trim(),

  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please enter a valid phone number'),

  body('subject')
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters')
    .trim(),

  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10 })
    .withMessage('Message must be at least 10 characters')
    .isLength({ max: 2000 })
    .withMessage('Message cannot exceed 2000 characters')
];

const replyContactValidator = [
  body('replyMessage')
    .notEmpty()
    .withMessage('Reply message is required')
    .isLength({ min: 10 })
    .withMessage('Reply must be at least 10 characters')
    .isLength({ max: 3000 })
    .withMessage('Reply cannot exceed 3000 characters')
];

const updateStatusValidator = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['unread', 'read', 'replied', 'archived'])
    .withMessage('Invalid status value')
];

module.exports = {
  createContactValidator,
  replyContactValidator,
  updateStatusValidator
};