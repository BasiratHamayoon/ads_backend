const mongoose = require('mongoose');

var jobAdSchema = new mongoose.Schema(
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
    gallery: [
      {
        url: String,
        publicId: String
      }
    ],
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

jobAdSchema.index({ category: 1, status: 1 });
jobAdSchema.index({ status: 1, createdAt: -1 });
jobAdSchema.index({ isFeatured: 1, status: 1 });
jobAdSchema.index({ tags: 1 });
jobAdSchema.index({ 'location.city': 1 });
jobAdSchema.index({ jobType: 1 });
jobAdSchema.index({ title: 'text', description: 'text', tags: 'text' });

jobAdSchema.virtual('isExpired').get(function () {
  if (this.applicationDeadline) {
    return new Date() > this.applicationDeadline;
  }
  return false;
});

module.exports = mongoose.model('JobAd', jobAdSchema);