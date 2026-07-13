const express = require('express');
const router = express.Router();
const {
  createJobAd,
  getAllJobAds,
  getJobAdsByCategory,
  getJobAdById,
  getJobAdBySlug,
  updateJobAd,
  deleteJobAd,
  deleteGalleryImage,
  toggleJobAdStatus,
  toggleFeatured,
  getFeaturedJobAds,
  getLatestJobAds,
  bulkUpdateStatus,
  bulkDelete
} = require('../controllers/jobAdController');
const { protect } = require('../middlewares/authMiddleware');
const { uploadMultiple } = require('../middlewares/uploadMiddleware');
const { createJobAdValidator, updateJobAdValidator } = require('../validators/jobAdValidator');
const validateRequest = require('../middlewares/validateRequest');

// Public routes (order matters - specific routes before parameterized)
router.get('/featured', getFeaturedJobAds);
router.get('/latest', getLatestJobAds);
router.get('/category/:categoryId', getJobAdsByCategory);
router.get('/slug/:slug', getJobAdBySlug);
router.get('/', getAllJobAds);
router.get('/:id', getJobAdById);

// Protected routes (Admin only)
router.post('/', protect, uploadMultiple, createJobAd);
router.put('/:id', protect, uploadMultiple, updateJobAd);
router.delete('/:id', protect, deleteJobAd);
router.delete('/:id/gallery/:publicId', protect, deleteGalleryImage);
router.patch('/:id/toggle-status', protect, toggleJobAdStatus);
router.patch('/:id/toggle-featured', protect, toggleFeatured);
router.patch('/bulk-status', protect, bulkUpdateStatus);
router.delete('/bulk-delete', protect, bulkDelete);

module.exports = router;