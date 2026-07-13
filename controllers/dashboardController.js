const JobAd = require('../models/JobAd');
const Category = require('../models/Category');
const { getDateRanges, calculatePercentageChange } = require('../utils/helpers');

// @desc    Get dashboard overview stats
// @route   GET /api/v1/dashboard/stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    const dateRanges = getDateRanges();

    // Total counts
    const totalJobAds = await JobAd.countDocuments();
    const activeJobAds = await JobAd.countDocuments({ status: 'active' });
    const inactiveJobAds = await JobAd.countDocuments({ status: 'inactive' });
    const draftJobAds = await JobAd.countDocuments({ status: 'draft' });
    const expiredJobAds = await JobAd.countDocuments({ status: 'expired' });
    const featuredJobAds = await JobAd.countDocuments({ isFeatured: true, status: 'active' });
    const totalCategories = await Category.countDocuments();
    const activeCategories = await Category.countDocuments({ isActive: true });

    // Today's stats
    const todayJobAds = await JobAd.countDocuments({
      createdAt: { $gte: dateRanges.todayStart, $lt: dateRanges.todayEnd }
    });

    // This week's stats
    const thisWeekJobAds = await JobAd.countDocuments({
      createdAt: { $gte: dateRanges.thisWeekStart }
    });

    // This month's stats
    const thisMonthJobAds = await JobAd.countDocuments({
      createdAt: { $gte: dateRanges.thisMonthStart }
    });

    // Last month's stats (for comparison)
    const lastMonthJobAds = await JobAd.countDocuments({
      createdAt: { $gte: dateRanges.lastMonthStart, $lte: dateRanges.lastMonthEnd }
    });

    // Total views
    const viewsResult = await JobAd.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    const totalViews = viewsResult.length > 0 ? viewsResult[0].totalViews : 0;

    // Monthly growth percentage
    const monthlyGrowth = calculatePercentageChange(thisMonthJobAds, lastMonthJobAds);

    res.status(200).json({
      success: true,
      message: 'Dashboard stats fetched successfully',
      data: {
        overview: {
          totalJobAds,
          activeJobAds,
          inactiveJobAds,
          draftJobAds,
          expiredJobAds,
          featuredJobAds,
          totalCategories,
          activeCategories,
          totalViews
        },
        period: {
          today: todayJobAds,
          thisWeek: thisWeekJobAds,
          thisMonth: thisMonthJobAds,
          lastMonth: lastMonthJobAds,
          monthlyGrowth: `${monthlyGrowth}%`
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
};

// @desc    Get jobs per category stats
// @route   GET /api/v1/dashboard/category-stats
// @access  Private (Admin)
const getCategoryStats = async (req, res) => {
  try {
    const categoryStats = await JobAd.aggregate([
      {
        $group: {
          _id: '$category',
          totalJobs: { $sum: 1 },
          activeJobs: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalViews: { $sum: '$views' },
          featuredJobs: {
            $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: '$category.name',
          categorySlug: '$category.slug',
          isActive: '$category.isActive',
          totalJobs: 1,
          activeJobs: 1,
          totalViews: 1,
          featuredJobs: 1
        }
      },
      { $sort: { totalJobs: -1 } }
    ]);

    res.status(200).json({
      success: true,
      message: 'Category stats fetched successfully',
      data: { categoryStats }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category stats',
      error: error.message
    });
  }
};

// @desc    Get job type distribution
// @route   GET /api/v1/dashboard/job-type-stats
// @access  Private (Admin)
const getJobTypeStats = async (req, res) => {
  try {
    const jobTypeStats = await JobAd.aggregate([
      {
        $group: {
          _id: '$jobType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          jobType: '$_id',
          count: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Job type stats fetched successfully',
      data: { jobTypeStats }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job type stats',
      error: error.message
    });
  }
};

// @desc    Get location distribution
// @route   GET /api/v1/dashboard/location-stats
// @access  Private (Admin)
const getLocationStats = async (req, res) => {
  try {
    const locationStats = await JobAd.aggregate([
      {
        $group: {
          _id: '$location.city',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          city: { $ifNull: ['$_id', 'Not Specified'] },
          count: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Location stats fetched successfully',
      data: { locationStats }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location stats',
      error: error.message
    });
  }
};

// @desc    Get source websites stats
// @route   GET /api/v1/dashboard/source-stats
// @access  Private (Admin)
const getSourceStats = async (req, res) => {
  try {
    const sourceStats = await JobAd.aggregate([
      {
        $group: {
          _id: '$source.websiteName',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          sourceName: '$_id',
          totalAds: '$count',
          activeAds: '$activeCount'
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Source stats fetched successfully',
      data: { sourceStats }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch source stats',
      error: error.message
    });
  }
};

// @desc    Get monthly job posting trends (last 12 months)
// @route   GET /api/v1/dashboard/monthly-trends
// @access  Private (Admin)
const getMonthlyTrends = async (req, res) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyTrends = await JobAd.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          views: { $sum: '$views' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          jobsPosted: '$count',
          totalViews: '$views'
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Monthly trends fetched successfully',
      data: { monthlyTrends }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly trends',
      error: error.message
    });
  }
};

// @desc    Get recent job ads (for dashboard)
// @route   GET /api/v1/dashboard/recent-jobs
// @access  Private (Admin)
const getRecentJobs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const recentJobs = await JobAd.find()
      .populate('category', 'name slug')
      .select('title company.name status views isFeatured createdAt jobType location.city')
      .sort('-createdAt')
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Recent jobs fetched successfully',
      count: recentJobs.length,
      data: { recentJobs }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent jobs',
      error: error.message
    });
  }
};

// @desc    Get top viewed job ads
// @route   GET /api/v1/dashboard/top-viewed
// @access  Private (Admin)
const getTopViewedJobs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const topViewed = await JobAd.find({ status: 'active' })
      .populate('category', 'name slug')
      .select('title company.name views isFeatured createdAt category')
      .sort('-views')
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Top viewed jobs fetched successfully',
      count: topViewed.length,
      data: { topViewed }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top viewed jobs',
      error: error.message
    });
  }
};

// @desc    Get expiring soon job ads
// @route   GET /api/v1/dashboard/expiring-soon
// @access  Private (Admin)
const getExpiringSoon = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const expiringSoon = await JobAd.find({
      applicationDeadline: {
        $gte: new Date(),
        $lte: futureDate
      },
      status: 'active'
    })
      .populate('category', 'name slug')
      .select('title company.name applicationDeadline status category')
      .sort('applicationDeadline')
      .limit(20);

    res.status(200).json({
      success: true,
      message: 'Expiring soon jobs fetched successfully',
      count: expiringSoon.length,
      data: { expiringSoon }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expiring jobs',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getCategoryStats,
  getJobTypeStats,
  getLocationStats,
  getSourceStats,
  getMonthlyTrends,
  getRecentJobs,
  getTopViewedJobs,
  getExpiringSoon
};