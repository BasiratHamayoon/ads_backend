const mongoose = require('mongoose');
const slugify = require('slugify');

const jobAdSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
    },
    
    // Source information (where the ad was taken from)
    source: {
      websiteName: {
        type: String,
        required: [true, 'Source website name is required'],
        trim: true
      },
      websiteUrl: {
        type: String,
        required: [true, 'Source website URL is required'],
        trim: true
      },
      originalAdUrl: {
        type: String,
        default: '',
        trim: true
      }
    },

    // Company details
    company: {
      name: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true
      },
      logo: {
        url: {
          type: String,
          default: ''
        },
        publicId: {
          type: String,
          default: ''
        }
      },
      website: {
        type: String,
        default: ''
      }
    },

    // Job details
    location: {
      city: {
        type: String,
        default: '',
        trim: true
      },
      state: {
        type: String,
        default: '',
        trim: true
      },
      country: {
        type: String,
        default: 'Pakistan',
        trim: true
      },
      isRemote: {
        type: Boolean,
        default: false
      }
    },

    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance', 'temporary'],
      default: 'full-time'
    },

    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'executive', 'any'],
      default: 'any'
    },

    salary: {
      min: {
        type: Number,
        default: 0
      },
      max: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: 'PKR'
      },
      isNegotiable: {
        type: Boolean,
        default: false
      }
    },

    qualifications: {
      type: [String],
      default: []
    },

    skills: {
      type: [String],
      default: []
    },

    // Ad image/banner
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

    // Additional images (multiple ad screenshots)
    gallery: [
      {
        url: String,
        publicId: String
      }
    ],

    // Application details
    applicationDeadline: {
      type: Date,
      default: null
    },

    applicationMethod: {
      type: String,
      enum: ['email', 'website', 'phone', 'walk-in', 'online-form', 'other'],
      default: 'website'
    },

    applicationLink: {
      type: String,
      default: ''
    },

    contactEmail: {
      type: String,
      default: ''
    },

    contactPhone: {
      type: String,
      default: ''
    },

    // Meta
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired', 'draft'],
      default: 'active'
    },

    isFeatured: {
      type: Boolean,
      default: false
    },

    isUrgent: {
      type: Boolean,
      default: false
    },

    views: {
      type: Number,
      default: 0
    },

    tags: {
      type: [String],
      default: []
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },

    // SEO
    metaTitle: {
      type: String,
      default: ''
    },
    metaDescription: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
jobAdSchema.index({ category: 1, status: 1 });
jobAdSchema.index({ slug: 1 });
jobAdSchema.index({ status: 1, createdAt: -1 });
jobAdSchema.index({ isFeatured: 1, status: 1 });
jobAdSchema.index({ tags: 1 });
jobAdSchema.index({ 'location.city': 1 });
jobAdSchema.index({ jobType: 1 });
jobAdSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Generate slug before saving
jobAdSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now();
  }
  next();
});

// Check if job is expired
jobAdSchema.virtual('isExpired').get(function () {
  if (this.applicationDeadline) {
    return new Date() > this.applicationDeadline;
  }
  return false;
});

// Auto-expire jobs
jobAdSchema.pre('find', function () {
  // This runs before every find query - can be used for auto-expiry logic
});

module.exports = mongoose.model('JobAd', jobAdSchema);