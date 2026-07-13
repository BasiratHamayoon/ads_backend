const express = require('express');
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus
} = require('../controllers/categoryController');
const { protect } = require('../middlewares/authMiddleware');
const { uploadSingle } = require('../middlewares/uploadMiddleware');
const { createCategoryValidator, updateCategoryValidator } = require('../validators/categoryValidator');
const validateRequest = require('../middlewares/validateRequest');

// Public routes
router.get('/', getAllCategories);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/:id', getCategoryById);

// Protected routes (Admin only)
router.post('/', protect, uploadSingle, createCategoryValidator, validateRequest, createCategory);
router.put('/:id', protect, uploadSingle, updateCategoryValidator, validateRequest, updateCategory);
router.delete('/:id', protect, deleteCategory);
router.patch('/:id/toggle-status', protect, toggleCategoryStatus);

module.exports = router;