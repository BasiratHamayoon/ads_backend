const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  logout
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const {
  signupValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} = require('../validators/authValidator');
const validateRequest = require('../middlewares/validateRequest');

router.post('/signup', signupValidator, validateRequest, signup);
router.post('/login', loginValidator, validateRequest, login);
router.post('/forgot-password', forgotPasswordValidator, validateRequest, forgotPassword);
router.post('/reset-password/:token', resetPasswordValidator, validateRequest, resetPassword);
router.get('/verify-reset-token/:token', verifyResetToken);

router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;