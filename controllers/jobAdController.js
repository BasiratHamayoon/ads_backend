var JobAd = require('../models/JobAd');
var Category = require('../models/Category');
var APIFeatures = require('../utils/apiFeatures');
var cloudinaryConfig = require('../config/cloudinary');
var uploadFromBuffer = cloudinaryConfig.uploadFromBuffer;
var deleteFromCloudinary = cloudinaryConfig.deleteFromCloudinary;

var createSlug = function (text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    + '-' + Date.now();
};

var updateCategoryJobCount = async function (categoryId) {
  var count = await JobAd.countDocuments({
    category: categoryId,
    status: 'active'
  });
  await Category.findByIdAndUpdate(categoryId, { jobCount: count });
};

var createJobAd = async function (req, res) {
  try {
    var jobData = Object.assign({}, req.body);

    if (typeof jobData.source === 'string') jobData.source = JSON.parse(jobData.source);
    if (typeof jobData.company === 'string') jobData.company = JSON.parse(jobData.company);
    if (typeof jobData.location === 'string') jobData.location = JSON.parse(jobData.location);
    if (typeof jobData.salary === 'string') jobData.salary = JSON.parse(jobData.salary);
    if (typeof jobData.qualifications === 'string') jobData.qualifications = JSON.parse(jobData.qualifications);
    if (typeof jobData.skills === 'string') jobData.skills = JSON.parse(jobData.skills);
    if (typeof jobData.tags === 'string') jobData.tags = JSON.parse(jobData.tags);

    var category = await Category.findById(jobData.category);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    jobData.postedBy = req.admin._id;
    jobData.slug = createSlug(jobData.title);

    if (req.files && req.files.image && req.files.image[0]) {
      var imageResult = await uploadFromBuffer(req.files.image[0].buffer, 'job-ads-aggregator/job-ads');
      jobData.image = { url: imageResult.secure_url, publicId: imageResult.public_id };
    }

    if (req.files && req.files.companyLogo && req.files.companyLogo[0]) {
      var logoResult = await uploadFromBuffer(req.files.companyLogo[0].buffer, 'job-ads-aggregator/company-logos');
      if (!jobData.company) jobData.company = {};
      jobData.company.logo = { url: logoResult.secure_url, publicId: logoResult.public_id };
    }

    if (req.files && req.files.gallery && req.files.gallery.length > 0) {
      jobData.gallery = [];
      for (var i = 0; i < req.files.gallery.length; i++) {
        var galleryResult = await uploadFromBuffer(req.files.gallery[i].buffer, 'job-ads-aggregator/job-ads/gallery');
        jobData.gallery.push({ url: galleryResult.secure_url, publicId: galleryResult.public_id });
      }
    }

    var jobAd = await JobAd.create(jobData);

    await updateCategoryJobCount(jobData.category);

    var populatedJobAd = await JobAd.findById(jobAd._id)
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

var getAllJobAds = async function (req, res) {
  try {
    var countQuery = JobAd.find();
    var countFeatures = new APIFeatures(countQuery, req.query).search().filter();
    var totalCount = await JobAd.countDocuments(countFeatures.query.getFilter());

    var query = JobAd.find()
      .populate('category', 'name slug icon')
      .populate('postedBy', 'name');

    var features = new APIFeatures(query, req.query)
      .search()
      .filter()
      .sort()
      .limitFields()
      .paginate();

    var jobAds = await features.query;

    var page = features.page || 1;
    var limit = features.limit || 12;
    var totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      message: 'Job ads fetched successfully',
      count: jobAds.length,
      data: { jobAds: jobAds },
      pagination: {
        currentPage: page,
        totalPages: totalPages,
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

var getJobAdsByCategory = async function (req, res) {
  try {
    var categoryId = req.params.categoryId;

    var category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    var page = parseInt(req.query.page, 10) || 1;
    var limit = parseInt(req.query.limit, 10) || 12;
    var skip = (page - 1) * limit;

    var filter = { category: categoryId, status: 'active' };
    var totalCount = await JobAd.countDocuments(filter);

    var jobAds = await JobAd.find(filter)
      .populate('category', 'name slug icon')
      .populate('postedBy', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    var totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      message: 'Job ads for category fetched successfully',
      count: jobAds.length,
      data: { category: category, jobAds: jobAds },
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch job ads by category', error: error.message });
  }
};

var getJobAdById = async function (req, res) {
  try {
    var jobAd = await JobAd.findById(req.params.id)
      .populate('category', 'name slug icon')
      .populate('postedBy', 'name email');

    if (!jobAd) {
      return res.status(404).json({ success: false, message: 'Job ad not found' });
    }

    jobAd.views = jobAd.views + 1;
    await jobAd.save();

    var relatedJobs = await JobAd.find({
      category: jobAd.category._id,
      _id: { $ne: jobAd._id },
      status: 'active'
    }).select('title slug company.name location jobType image createdAt').limit(5).sort('-createdAt');

    res.status(200).json({
      success: true,
      message: 'Job ad fetched successfully',
      data: { jobAd: jobAd, relatedJobs: relatedJobs }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch job ad', error: error.message });
  }
};

var getJobAdBySlug = async function (req, res) {
  try {
    var jobAd = await JobAd.findOne({ slug: req.params.slug })
      .populate('category', 'name slug icon')
      .populate('postedBy', 'name email');

    if (!jobAd) {
      return res.status(404).json({ success: false, message: 'Job ad not found' });
    }

    jobAd.views = jobAd.views + 1;
    await jobAd.save();

    var relatedJobs = await JobAd.find({
      category: jobAd.category._id,
      _id: { $ne: jobAd._id },
      status: 'active'
    }).select('title slug company.name location jobType image createdAt').limit(5).sort('-createdAt');

    res.status(200).json({
      success: true,
      message: 'Job ad fetched successfully',
      data: { jobAd: jobAd, relatedJobs: relatedJobs }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch job ad', error: error.message });
  }
};

var updateJobAd = async function (req, res) {
  try {
    var jobAd = await JobAd.findById(req.params.id);
    if (!jobAd) {
      return res.status(404).json({ success: false, message: 'Job ad not found' });
    }

    var updateData = Object.assign({}, req.body);

    if (typeof updateData.source === 'string') updateData.source = JSON.parse(updateData.source);
    if (typeof updateData.company === 'string') updateData.company = JSON.parse(updateData.company);
    if (typeof updateData.location === 'string') updateData.location = JSON.parse(updateData.location);
    if (typeof updateData.salary === 'string') updateData.salary = JSON.parse(updateData.salary);
    if (typeof updateData.qualifications === 'string') updateData.qualifications = JSON.parse(updateData.qualifications);
    if (typeof updateData.skills === 'string') updateData.skills = JSON.parse(updateData.skills);
    if (typeof updateData.tags === 'string') updateData.tags = JSON.parse(updateData.tags);

    if (updateData.title) {
      updateData.slug = createSlug(updateData.title);
    }

    if (req.files && req.files.image && req.files.image[0]) {
      if (jobAd.image && jobAd.image.publicId) {
        await deleteFromCloudinary(jobAd.image.publicId);
      }
      var imgResult = await uploadFromBuffer(req.files.image[0].buffer, 'job-ads-aggregator/job-ads');
      updateData.image = { url: imgResult.secure_url, publicId: imgResult.public_id };
    }

    if (req.files && req.files.companyLogo && req.files.companyLogo[0]) {
      if (jobAd.company && jobAd.company.logo && jobAd.company.logo.publicId) {
        await deleteFromCloudinary(jobAd.company.logo.publicId);
      }
      var logoRes = await uploadFromBuffer(req.files.companyLogo[0].buffer, 'job-ads-aggregator/company-logos');
      if (!updateData.company) updateData.company = jobAd.company.toObject();
      updateData.company.logo = { url: logoRes.secure_url, publicId: logoRes.public_id };
    }

    if (req.files && req.files.gallery && req.files.gallery.length > 0) {
      var newGallery = [];
      for (var g = 0; g < req.files.gallery.length; g++) {
        var galResult = await uploadFromBuffer(req.files.gallery[g].buffer, 'job-ads-aggregator/job-ads/gallery');
        newGallery.push({ url: galResult.secure_url, publicId: galResult.public_id });
      }
      updateData.gallery = (jobAd.gallery || []).concat(newGallery);
    }

    var oldCategory = jobAd.category;

    jobAd = await JobAd.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('category', 'name slug')
      .populate('postedBy', 'name email');

    if (updateData.category && updateData.category.toString() !== oldCategory.toString()) {
      await updateCategoryJobCount(oldCategory);
      await updateCategoryJobCount(updateData.category);
    }

    res.status(200).json({
      success: true,
      message: 'Job ad updated successfully',
      data: { jobAd: jobAd }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update job ad', error: error.message });
  }
};

var deleteJobAd = async function (req, res) {
  try {
    var jobAd = await JobAd.findById(req.params.id);
    if (!jobAd) {
      return res.status(404).json({ success: false, message: 'Job ad not found' });
    }

    if (jobAd.image && jobAd.image.publicId) {
      await deleteFromCloudinary(jobAd.image.publicId);
    }
    if (jobAd.company && jobAd.company.logo && jobAd.company.logo.publicId) {
      await deleteFromCloudinary(jobAd.company.logo.publicId);
    }
    if (jobAd.gallery && jobAd.gallery.length > 0) {
      for (var d = 0; d < jobAd.gallery.length; d++) {
        if (jobAd.gallery[d].publicId) await deleteFromCloudinary(jobAd.gallery[d].publicId);
      }
    }

    var categoryId = jobAd.category;
    await JobAd.findByIdAndDelete(req.params.id);
    await updateCategoryJobCount(categoryId);

    res.status(200).json({ success: true, message: 'Job ad deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete job ad', error: error.message });
  }
};

var deleteGalleryImage = async function (req, res) {
  try {
    var jobAd = await JobAd.findById(req.params.id);
    if (!jobAd) {
      return res.status(404).json({ success: false, message: 'Job ad not found' });
    }

    var publicId = req.params.publicId;
    var imageIndex = -1;
    for (var i = 0; i < jobAd.gallery.length; i++) {
      if (jobAd.gallery[i].publicId === publicId || jobAd.gallery[i].publicId.endsWith(publicId)) {
        imageIndex = i;
        break;
      }
    }

    if (imageIndex === -1) {
      return res.status(404).json({ success: false, message: 'Gallery image not found' });
    }

    await deleteFromCloudinary(jobAd.gallery[imageIndex].publicId);
    jobAd.gallery.splice(imageIndex, 1);
    await jobAd.save();

    res.status(200).json({ success: true, message: 'Gallery image deleted successfully', data: { gallery: jobAd.gallery } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete gallery image', error: error.message });
  }
};

var toggleJobAdStatus = async function (req, res) {
  try {
    var jobAd = await JobAd.findById(req.params.id);
    if (!jobAd) {
      return res.status(404).json({ success: false, message: 'Job ad not found' });
    }

    jobAd.status = jobAd.status === 'active' ? 'inactive' : 'active';
    await jobAd.save();
    await updateCategoryJobCount(jobAd.category);

    res.status(200).json({
      success: true,
      message: 'Job ad ' + (jobAd.status === 'active' ? 'activated' : 'deactivated') + ' successfully',
      data: { jobAd: jobAd }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle job ad status', error: error.message });
  }
};

var toggleFeatured = async function (req, res) {
  try {
    var jobAd = await JobAd.findById(req.params.id);
    if (!jobAd) {
      return res.status(404).json({ success: false, message: 'Job ad not found' });
    }

    jobAd.isFeatured = !jobAd.isFeatured;
    await jobAd.save();

    res.status(200).json({
      success: true,
      message: 'Job ad ' + (jobAd.isFeatured ? 'featured' : 'unfeatured') + ' successfully',
      data: { jobAd: jobAd }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle featured status', error: error.message });
  }
};

var getFeaturedJobAds = async function (req, res) {
  try {
    var limit = parseInt(req.query.limit, 10) || 10;
    var jobAds = await JobAd.find({ isFeatured: true, status: 'active' })
      .populate('category', 'name slug icon')
      .sort('-createdAt')
      .limit(limit);

    res.status(200).json({ success: true, message: 'Featured job ads fetched', count: jobAds.length, data: { jobAds: jobAds } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch featured job ads', error: error.message });
  }
};

var getLatestJobAds = async function (req, res) {
  try {
    var limit = parseInt(req.query.limit, 10) || 10;
    var jobAds = await JobAd.find({ status: 'active' })
      .populate('category', 'name slug icon')
      .sort('-createdAt')
      .limit(limit);

    res.status(200).json({ success: true, message: 'Latest job ads fetched', count: jobAds.length, data: { jobAds: jobAds } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch latest job ads', error: error.message });
  }
};

var bulkUpdateStatus = async function (req, res) {
  try {
    var ids = req.body.ids;
    var status = req.body.status;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of job ad IDs' });
    }

    if (['active', 'inactive', 'expired', 'draft'].indexOf(status) === -1) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    var result = await JobAd.updateMany({ _id: { $in: ids } }, { status: status }, { runValidators: true });

    var affectedJobs = await JobAd.find({ _id: { $in: ids } }).select('category');
    var categoryIds = [];
    affectedJobs.forEach(function (j) {
      var catId = j.category.toString();
      if (categoryIds.indexOf(catId) === -1) categoryIds.push(catId);
    });
    for (var c = 0; c < categoryIds.length; c++) {
      await updateCategoryJobCount(categoryIds[c]);
    }

    res.status(200).json({ success: true, message: result.modifiedCount + ' job ad(s) updated', data: { modifiedCount: result.modifiedCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to bulk update status', error: error.message });
  }
};

var bulkDelete = async function (req, res) {
  try {
    var ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of job ad IDs' });
    }

    var jobAds = await JobAd.find({ _id: { $in: ids } });

    for (var j = 0; j < jobAds.length; j++) {
      if (jobAds[j].image && jobAds[j].image.publicId) {
        await deleteFromCloudinary(jobAds[j].image.publicId).catch(function () {});
      }
      if (jobAds[j].company && jobAds[j].company.logo && jobAds[j].company.logo.publicId) {
        await deleteFromCloudinary(jobAds[j].company.logo.publicId).catch(function () {});
      }
      if (jobAds[j].gallery) {
        for (var g = 0; g < jobAds[j].gallery.length; g++) {
          if (jobAds[j].gallery[g].publicId) await deleteFromCloudinary(jobAds[j].gallery[g].publicId).catch(function () {});
        }
      }
    }

    var categoryIds = [];
    jobAds.forEach(function (j) {
      var catId = j.category.toString();
      if (categoryIds.indexOf(catId) === -1) categoryIds.push(catId);
    });

    var result = await JobAd.deleteMany({ _id: { $in: ids } });

    for (var c = 0; c < categoryIds.length; c++) {
      await updateCategoryJobCount(categoryIds[c]);
    }

    res.status(200).json({ success: true, message: result.deletedCount + ' job ad(s) deleted', data: { deletedCount: result.deletedCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to bulk delete job ads', error: error.message });
  }
};

module.exports = {
  createJobAd: createJobAd,
  getAllJobAds: getAllJobAds,
  getJobAdsByCategory: getJobAdsByCategory,
  getJobAdById: getJobAdById,
  getJobAdBySlug: getJobAdBySlug,
  updateJobAd: updateJobAd,
  deleteJobAd: deleteJobAd,
  deleteGalleryImage: deleteGalleryImage,
  toggleJobAdStatus: toggleJobAdStatus,
  toggleFeatured: toggleFeatured,
  getFeaturedJobAds: getFeaturedJobAds,
  getLatestJobAds: getLatestJobAds,
  bulkUpdateStatus: bulkUpdateStatus,
  bulkDelete: bulkDelete
};