const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Category name cannot exceed 50 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true
    },
    description: {
      type: String,
      default: '',
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    icon: {
      type: String,
      default: ''
    },
    image: {
      url: {
        type: String,
        default: ''
      },
      publicId: {
        type: String,
        default: ''
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    jobCount: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate slug before saving
categorySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Virtual populate - get jobs in this category
categorySchema.virtual('jobs', {
  ref: 'JobAd',
  localField: '_id',
  foreignField: 'category',
  justOne: false
});

module.exports = mongoose.model('Category', categorySchema);