const JobAd = require('../models/JobAd');
const Category = require('../models/Category');
const APIFeatures = require('../utils/apiFeatures');
const { uploadFromBuffer, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Create job ad
// @route   POST /api/v1/job-ads
// @access  Private (Admin)
const createJobAd = async (req, res) => {
  try {
    // Parse JSON fields from form-data
    let jobData = { ...req.body };
    
    // Parse nested objects if they come as strings (from form-data)
    if (typeof jobData.source === 'string') jobData.source = JSON.parse(jobData.source);
    if (typeof jobData.company === 'string') jobData.company = JSON.parse(jobData.company);
    if (typeof jobData.location === 'string') jobData.location = JSON.parse(jobData.location);
    if (typeof jobData.salary === 'string') jobData.salary = JSON.parse(jobData.salary);
    if (typeof jobData.qualifications === 'string') jobData.qualifications = JSON.parse(jobData.qualifications);
    if (typeof jobData.skills === 'string') jobData.skills = JSON.parse(jobData.skills);
    if (typeof jobData.tags === 'string') jobData.tags = JSON.parse(jobData.tags);

    // Verify category exists
    const category = await Category.findById(jobData.category);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    jobData.postedBy = req.admin._id;

    // Handle main image upload
    if (req.files && req.files.image && req.files.image[0]) {
      const result = await uploadFromBuffer(
        req.files.image[0].buffer,
        'job-ads-aggregator/job-ads'
      );
      jobData.image = {
        url: result.secure_url,
        publicId: result.public_id
      };
    }

    // Handle company logo upload
    if (req.files && req.files.companyLogo && req.files.companyLogo[0]) {
      const result = await uploadFromBuffer(
        req.files.companyLogo[0].buffer,
        'job-ads-aggregator/company-logos'
      );
      if (!jobData.company) jobData.company = {};
      jobData.company.logo = {
        url: result.secure_url,
        publicId: result.public_id
      };
    }

    // Handle gallery images upload
    if (req.files && req.files.gallery && req.files.gallery.length > 0) {
      jobData.gallery = [];
      for (const file of req.files.gallery) {
        const result = await uploadFromBuffer(
          file.buffer,
          'job-ads-aggregator/job-ads/gallery'
        );
        jobData.gallery.push({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    }

    const jobAd = await JobAd.create(jobData);

    // Update category job count
    await updateCategoryJobCount(jobData.category);

    // Populate the response
    const populatedJobAd = await JobAd.findById(jobAd._id)
      .populate('category', 'name slug')
      .populate('postedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Job ad created successfully',
      data: { jobAd: populatedJobAd }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create job ad',
      error: error.message
    });
  }
};

// @desc    Get all job ads (with filters, search, pagination)
// @route   GET /api/v1/job-ads
// @access  Public
const getAllJobAds = async (req, res) => {
  try {
    // Count total documents matching the filter (before pagination)
    let countQuery = JobAd.find();
    const countFeatures = new APIFeatures(countQuery, req.query).search().filter();
    const totalCount = await JobAd.countDocuments(countFeatures.query.getFilter());

    // Apply all features
    let query = JobAd.find()
      .populate('category', 'name slug icon')
      .populate('postedBy', 'name');

    const features = new APIFeatures(query, req.query)
      .search()
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const jobAds = await features.query;

    const page = features.page || 1;
    const limit = features.limit || 12;
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      message: 'Job ads fetched successfully',
      count: jobAds.length,
      data: { jobAds },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job ads',
      error: error.message
    });
  }
};

// @desc    Get job ads by category
// @route   GET /api/v1/job-ads/category/:categoryId
// @access  Public
const getJobAdsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const skip = (page - 1) * limit;

    const filter = { category: categoryId, status: 'active' };

    const totalCount = await JobAd.countDocuments(filter);
    const jobAds = await JobAd.find(filter)
      .populate('category', 'name slug icon')
      .populate('postedBy', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      message: `Job ads for category "${category.name}" fetched successfully`,
      count: jobAds.length,
      data: { category, jobAds },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job ads by category',
      error: error.message
    });
  }
};

// @desc    Get single job ad by ID
// @route   GET /api/v1/job-ads/:id
// @access  Public
const getJobAdById = async (req, res) => {
  try {
    const jobAd = await JobAd.findById(req.params.id)
      .populate('category', 'name slug icon')
      .populate('postedBy', 'name email');

    if (!jobAd) {
      return res.status(404).json({
        success: false,
        message: 'Job ad not found'
      });
    }

    // Increment views
    jobAd.views += 1;
    await jobAd.save({ validateBeforeSave: false });

    // Get related jobs (same category, exclude current)
    const relatedJobs = await JobAd.find({
      category: jobAd.category._id,
      _id: { $ne: jobAd._id },
      status: 'active'
    })
      .select('title slug company.name location jobType image createdAt')
      .limit(5)
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      message: 'Job ad fetched successfully',
      data: { jobAd, relatedJobs }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job ad',
      error: error.message
    });
  }
};

// @desc    Get job ad by slug
// @route   GET /api/v1/job-ads/slug/:slug
// @access  Public
const getJobAdBySlug = async (req, res) => {
  try {
    const jobAd = await JobAd.findOne({ slug: req.params.slug })
      .populate('category', 'name slug icon')
      .populate('postedBy', 'name email');

    if (!jobAd) {
      return res.status(404).json({
        success: false,
        message: 'Job ad not found'
      });
    }

    // Increment views
    jobAd.views += 1;
    await jobAd.save({ validateBeforeSave: false });

    const relatedJobs = await JobAd.find({
      category: jobAd.category._id,
      _id: { $ne: jobAd._id },
      status: 'active'
    })
      .select('title slug company.name location jobType image createdAt')
      .limit(5)
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      message: 'Job ad fetched successfully',
      data: { jobAd, relatedJobs }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job ad',
      error: error.message
    });
  }
};

// @desc    Update job ad
// @route   PUT /api/v1/job-ads/:id
// @access  Private (Admin)
const updateJobAd = async (req, res) => {
  try {
    let jobAd = await JobAd.findById(req.params.id);

    if (!jobAd) {
      return res.status(404).json({
        success: false,
        message: 'Job ad not found'
      });
    }

    let updateData = { ...req.body };

    // Parse nested objects if they come as strings
    if (typeof updateData.source === 'string') updateData.source = JSON.parse(updateData.source);
    if (typeof updateData.company === 'string') updateData.company = JSON.parse(updateData.company);
    if (typeof updateData.location === 'string') updateData.location = JSON.parse(updateData.location);
    if (typeof updateData.salary === 'string') updateData.salary = JSON.parse(updateData.salary);
    if (typeof updateData.qualifications === 'string') updateData.qualifications = JSON.parse(updateData.qualifications);
    if (typeof updateData.skills === 'string') updateData.skills = JSON.parse(updateData.skills);
    if (typeof updateData.tags === 'string') updateData.tags = JSON.parse(updateData.tags);

    // Handle main image upload
    if (req.files && req.files.image && req.files.image[0]) {
      if (jobAd.image && jobAd.image.publicId) {
        await deleteFromCloudinary(jobAd.image.publicId);
      }
      const result = await uploadFromBuffer(
        req.files.image[0].buffer,
        'job-ads-aggregator/job-ads'
      );
      updateData.image = {
        url: result.secure_url,
        publicId: result.public_id
      };
    }

    // Handle company logo upload
    if (req.files && req.files.companyLogo && req.files.companyLogo[0]) {
      if (jobAd.company && jobAd.company.logo && jobAd.company.logo.publicId) {
        await deleteFromCloudinary(jobAd.company.logo.publicId);
      }
      const result = await uploadFromBuffer(
        req.files.companyLogo[0].buffer,
        'job-ads-aggregator/company-logos'
      );
      if (!updateData.company) updateData.company = { ...jobAd.company.toObject() };
      updateData.company.logo = {
        url: result.secure_url,
        publicId: result.public_id
      };
    }

    // Handle gallery images upload (append to existing)
    if (req.files && req.files.gallery && req.files.gallery.length > 0) {
      const newGalleryImages = [];
      for (const file of req.files.gallery) {
        const result = await uploadFromBuffer(
          file.buffer,
          'job-ads-aggregator/job-ads/gallery'
        );
        newGalleryImages.push({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
      updateData.gallery = [...(jobAd.gallery || []), ...newGalleryImages];
    }

    const oldCategory = jobAd.category;

    jobAd = await JobAd.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('category', 'name slug')
      .populate('postedBy', 'name email');

    // Update category job counts if category changed
    if (updateData.category && updateData.category.toString() !== oldCategory.toString()) {
      await updateCategoryJobCount(oldCategory);
      await updateCategoryJobCount(updateData.category);
    }

    res.status(200).json({
      success: true,
      message: 'Job ad updated successfully',
      data: { jobAd }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update job ad',
      error: error.message
    });
  }
};

// @desc    Delete job ad
// @route   DELETE /api/v1/job-ads/:id
// @access  Private (Admin)
const deleteJobAd = async (req, res) => {
  try {
    const jobAd = await JobAd.findById(req.params.id);

    if (!jobAd) {
      return res.status(404).json({
        success: false,
        message: 'Job ad not found'
      });
    }

    // Delete images from cloudinary
    if (jobAd.image && jobAd.image.publicId) {
      await deleteFromCloudinary(jobAd.image.publicId);
    }
    if (jobAd.company && jobAd.company.logo && jobAd.company.logo.publicId) {
      await deleteFromCloudinary(jobAd.company.logo.publicId);
    }
    if (jobAd.gallery && jobAd.gallery.length > 0) {
      for (const img of jobAd.gallery) {
        if (img.publicId) await deleteFromCloudinary(img.publicId);
      }
    }

    const categoryId = jobAd.category;
    await JobAd.findByIdAndDelete(req.params.id);

    // Update category job count
    await updateCategoryJobCount(categoryId);

    res.status(200).json({
      success: true,
      message: 'Job ad deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete job ad',
      error: error.message
    });
  }
};

// @desc    Delete gallery image from job ad
// @route   DELETE /api/v1/job-ads/:id/gallery/:publicId
// @access  Private (Admin)
const deleteGalleryImage = async (req, res) => {
  try {
    const jobAd = await JobAd.findById(req.params.id);

    if (!jobAd) {
      return res.status(404).json({
        success: false,
        message: 'Job ad not found'
      });
    }

    const publicId = req.params.publicId;

    // Find and remove the image from gallery
    const imageIndex = jobAd.gallery.findIndex(
      (img) => img.publicId === publicId || img.publicId.endsWith(publicId)
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Gallery image not found'
      });
    }

    // Delete from cloudinary
    await deleteFromCloudinary(jobAd.gallery[imageIndex].publicId);

    // Remove from array
    jobAd.gallery.splice(imageIndex, 1);
    await jobAd.save();

    res.status(200).json({
      success: true,
      message: 'Gallery image deleted successfully',
      data: { gallery: jobAd.gallery }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete gallery image',
      error: error.message
    });
  }
};

// @desc    Toggle job ad status
// @route   PATCH /api/v1/job-ads/:id/toggle-status
// @access  Private (Admin)
const toggleJobAdStatus = async (req, res) => {
  try {
    const jobAd = await JobAd.findById(req.params.id);

    if (!jobAd) {
      return res.status(404).json({
        success: false,
        message: 'Job ad not found'
      });
    }

    jobAd.status = jobAd.status === 'active' ? 'inactive' : 'active';
    await jobAd.save();

    await updateCategoryJobCount(jobAd.category);

    res.status(200).json({
      success: true,
      message: `Job ad ${jobAd.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: { jobAd }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle job ad status',
      error: error.message
    });
  }
};

// @desc    Toggle featured status
// @route   PATCH /api/v1/job-ads/:id/toggle-featured
// @access  Private (Admin)
const toggleFeatured = async (req, res) => {
  try {
    const jobAd = await JobAd.findById(req.params.id);

    if (!jobAd) {
      return res.status(404).json({
        success: false,
        message: 'Job ad not found'
      });
    }

    jobAd.isFeatured = !jobAd.isFeatured;
    await jobAd.save();

    res.status(200).json({
      success: true,
      message: `Job ad ${jobAd.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: { jobAd }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle featured status',
      error: error.message
    });
  }
};

// @desc    Get featured job ads
// @route   GET /api/v1/job-ads/featured
// @access  Public
const getFeaturedJobAds = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const jobAds = await JobAd.find({ isFeatured: true, status: 'active' })
      .populate('category', 'name slug icon')
      .sort('-createdAt')
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Featured job ads fetched successfully',
      count: jobAds.length,
      data: { jobAds }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured job ads',
      error: error.message
    });
  }
};

// @desc    Get latest job ads
// @route   GET /api/v1/job-ads/latest
// @access  Public
const getLatestJobAds = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const jobAds = await JobAd.find({ status: 'active' })
      .populate('category', 'name slug icon')
      .sort('-createdAt')
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Latest job ads fetched successfully',
      count: jobAds.length,
      data: { jobAds }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest job ads',
      error: error.message
    });
  }
};

// @desc    Bulk update status
// @route   PATCH /api/v1/job-ads/bulk-status
// @access  Private (Admin)
const bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of job ad IDs'
      });
    }

    if (!['active', 'inactive', 'expired', 'draft'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const result = await JobAd.updateMany(
      { _id: { $in: ids } },
      { status },
      { runValidators: true }
    );

    // Update category counts for affected jobs
    const affectedJobs = await JobAd.find({ _id: { $in: ids } }).select('category');
    const categoryIds = [...new Set(affectedJobs.map((j) => j.category.toString()))];
    for (const catId of categoryIds) {
      await updateCategoryJobCount(catId);
    }

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} job ad(s) updated to "${status}"`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update status',
      error: error.message
    });
  }
};

// @desc    Bulk delete job ads
// @route   DELETE /api/v1/job-ads/bulk-delete
// @access  Private (Admin)
const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of job ad IDs'
      });
    }

    // Get all jobs to delete their images
    const jobAds = await JobAd.find({ _id: { $in: ids } });

    // Delete images from cloudinary
    for (const jobAd of jobAds) {
      if (jobAd.image && jobAd.image.publicId) {
        await deleteFromCloudinary(jobAd.image.publicId).catch(() => {});
      }
      if (jobAd.company && jobAd.company.logo && jobAd.company.logo.publicId) {
        await deleteFromCloudinary(jobAd.company.logo.publicId).catch(() => {});
      }
      if (jobAd.gallery) {
        for (const img of jobAd.gallery) {
          if (img.publicId) await deleteFromCloudinary(img.publicId).catch(() => {});
        }
      }
    }

    // Get category IDs before deletion
    const categoryIds = [...new Set(jobAds.map((j) => j.category.toString()))];

    const result = await JobAd.deleteMany({ _id: { $in: ids } });

    // Update category counts
    for (const catId of categoryIds) {
      await updateCategoryJobCount(catId);
    }

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} job ad(s) deleted successfully`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete job ads',
      error: error.message
    });
  }
};

// Helper function to update category job count
const updateCategoryJobCount = async (categoryId) => {
  const count = await JobAd.countDocuments({ 
    category: categoryId, 
    status: 'active' 
  });
  await Category.findByIdAndUpdate(categoryId, { jobCount: count });
};

module.exports = {
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
};