const Category = require('../models/Category');
const JobAd = require('../models/JobAd');
const { uploadFromBuffer, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Create category
// @route   POST /api/v1/categories
// @access  Private (Admin)
const createCategory = async (req, res) => {
  try {
    const { name, description, icon, sortOrder } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const categoryData = {
      name,
      description,
      icon,
      sortOrder,
      createdBy: req.admin._id
    };

    // Handle image upload
    if (req.file) {
      const result = await uploadFromBuffer(req.file.buffer, 'job-ads-aggregator/categories');
      categoryData.image = {
        url: result.secure_url,
        publicId: result.public_id
      };
    }

    const category = await Category.create(categoryData);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

// @desc    Get all categories
// @route   GET /api/v1/categories
// @access  Public
const getAllCategories = async (req, res) => {
  try {
    const { active, sort } = req.query;

    let query = {};
    if (active === 'true') query.isActive = true;
    if (active === 'false') query.isActive = false;

    let sortOption = { sortOrder: 1, name: 1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === '-name') sortOption = { name: -1 };
    if (sort === 'jobCount') sortOption = { jobCount: -1 };

    const categories = await Category.find(query)
      .sort(sortOption)
      .populate('createdBy', 'name email');

    // Get job counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const jobCount = await JobAd.countDocuments({ 
          category: cat._id, 
          status: 'active' 
        });
        const catObj = cat.toObject();
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

// @desc    Get single category
// @route   GET /api/v1/categories/:id
// @access  Public
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get job count
    const jobCount = await JobAd.countDocuments({ 
      category: category._id, 
      status: 'active' 
    });

    const categoryObj = category.toObject();
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

// @desc    Get category by slug
// @route   GET /api/v1/categories/slug/:slug
// @access  Public
const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug })
      .populate('createdBy', 'name email');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const jobCount = await JobAd.countDocuments({ 
      category: category._id, 
      status: 'active' 
    });

    const categoryObj = category.toObject();
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

// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @access  Private (Admin)
const updateCategory = async (req, res) => {
  try {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const updateData = { ...req.body };

    // Handle image upload
    if (req.file) {
      // Delete old image from cloudinary
      if (category.image && category.image.publicId) {
        await deleteFromCloudinary(category.image.publicId);
      }

      const result = await uploadFromBuffer(req.file.buffer, 'job-ads-aggregator/categories');
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
      data: { category }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/v1/categories/:id
// @access  Private (Admin)
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if there are jobs in this category
    const jobCount = await JobAd.countDocuments({ category: category._id });
    if (jobCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${jobCount} job ad(s). Move or delete them first.`
      });
    }

    // Delete image from cloudinary
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

// @desc    Toggle category active status
// @route   PATCH /api/v1/categories/:id/toggle-status
// @access  Private (Admin)
const toggleCategoryStatus = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

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
      message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { category }
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
  createCategory,
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus
};