const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getCategoryStats,
  getJobTypeStats,
  getLocationStats,
  getSourceStats,
  getMonthlyTrends,
  getRecentJobs,
  getTopViewedJobs,
  getExpiringSoon
} = require('../controllers/dashboardController');
const { protect } = require('../middlewares/authMiddleware');

// All dashboard routes are protected
router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/category-stats', getCategoryStats);
router.get('/job-type-stats', getJobTypeStats);
router.get('/location-stats', getLocationStats);
router.get('/source-stats', getSourceStats);
router.get('/monthly-trends', getMonthlyTrends);
router.get('/recent-jobs', getRecentJobs);
router.get('/top-viewed', getTopViewedJobs);
router.get('/expiring-soon', getExpiringSoon);

module.exports = router;