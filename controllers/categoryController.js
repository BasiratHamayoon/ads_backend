const Category = require('../models/Category');
const JobAd = require('../models/JobAd');
const { uploadFromBuffer, deleteFromCloudinary } = require('../config/cloudinary');

function createSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

var createCategory = async function (req, res) {
  try {
    var name = req.body.name;
    var description = req.body.description;
    var icon = req.body.icon;
    var sortOrder = req.body.sortOrder;

    var existingCategory = await Category.findOne({
      name: { $regex: new RegExp('^' + name + '$', 'i') }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    var slug = createSlug(name);

    var existingSlug = await Category.findOne({ slug: slug });
    if (existingSlug) {
      slug = slug + '-' + Date.now();
    }

    var categoryData = {
      name: name,
      slug: slug,
      description: description || '',
      icon: icon || '',
      sortOrder: sortOrder || 0,
      createdBy: req.admin._id
    };

    if (req.file) {
      var result = await uploadFromBuffer(req.file.buffer, 'job-ads-aggregator/categories');
      categoryData.image = {
        url: result.secure_url,
        publicId: result.public_id
      };
    }

    var category = await Category.create(categoryData);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category: category }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

var getAllCategories = async function (req, res) {
  try {
    var active = req.query.active;
    var sort = req.query.sort;

    var query = {};
    if (active === 'true') query.isActive = true;
    if (active === 'false') query.isActive = false;

    var sortOption = { sortOrder: 1, name: 1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === '-name') sortOption = { name: -1 };
    if (sort === 'jobCount') sortOption = { jobCount: -1 };

    var categories = await Category.find(query)
      .sort(sortOption)
      .populate('createdBy', 'name email');

    var categoriesWithCounts = await Promise.all(
      categories.map(async function (cat) {
        var jobCount = await JobAd.countDocuments({
          category: cat._id,
          status: 'active'
        });
        var catObj = cat.toObject();
        catObj.jobCount = jobCount;
        return catObj;
      })
    );

    res.status(200).json({
      success: true,
      message: 'Categories fetched successfully',
      count: categoriesWithCounts.length,
      data: { categories: categoriesWithCounts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

var getCategoryById = async function (req, res) {
  try {
    var category = await Category.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    var jobCount = await JobAd.countDocuments({
      category: category._id,
      status: 'active'
    });

    var categoryObj = category.toObject();
    categoryObj.jobCount = jobCount;

    res.status(200).json({
      success: true,
      message: 'Category fetched successfully',
      data: { category: categoryObj }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
};

var getCategoryBySlug = async function (req, res) {
  try {
    var category = await Category.findOne({ slug: req.params.slug })
      .populate('createdBy', 'name email');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    var jobCount = await JobAd.countDocuments({
      category: category._id,
      status: 'active'
    });

    var categoryObj = category.toObject();
    categoryObj.jobCount = jobCount;

    res.status(200).json({
      success: true,
      message: 'Category fetched successfully',
      data: { category: categoryObj }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
};

var updateCategory = async function (req, res) {
  try {
    var category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    var updateData = {};

    if (req.body.name) {
      updateData.name = req.body.name;
      updateData.slug = createSlug(req.body.name);

      var existingSlug = await Category.findOne({
        slug: updateData.slug,
        _id: { $ne: req.params.id }
      });
      if (existingSlug) {
        updateData.slug = updateData.slug + '-' + Date.now();
      }
    }

    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.icon !== undefined) updateData.icon = req.body.icon;
    if (req.body.sortOrder !== undefined) updateData.sortOrder = req.body.sortOrder;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    if (req.file) {
      if (category.image && category.image.publicId) {
        await deleteFromCloudinary(category.image.publicId);
      }

      var result = await uploadFromBuffer(req.file.buffer, 'job-ads-aggregator/categories');
      updateData.image = {
        url: result.secure_url,
        publicId: result.public_id
      };
    }

    category = await Category.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category: category }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

var deleteCategory = async function (req, res) {
  try {
    var category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    var jobCount = await JobAd.countDocuments({ category: category._id });
    if (jobCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category. It has ' + jobCount + ' job ad(s). Move or delete them first.'
      });
    }

    if (category.image && category.image.publicId) {
      await deleteFromCloudinary(category.image.publicId);
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

var toggleCategoryStatus = async function (req, res) {
  try {
    var category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    category.isActive = !category.isActive;
    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category ' + (category.isActive ? 'activated' : 'deactivated') + ' successfully',
      data: { category: category }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle category status',
      error: error.message
    });
  }
};

module.exports = {
  createCategory: createCategory,
  getAllCategories: getAllCategories,
  getCategoryById: getCategoryById,
  getCategoryBySlug: getCategoryBySlug,
  updateCategory: updateCategory,
  deleteCategory: deleteCategory,
  toggleCategoryStatus: toggleCategoryStatus
};