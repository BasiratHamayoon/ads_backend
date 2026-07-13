const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      default: 'Job Ads Aggregator'
    },
    siteDescription: {
      type: String,
      default: 'Find the latest job opportunities from across the web'
    },
    siteLogo: {
      url: {
        type: String,
        default: ''
      },
      publicId: {
        type: String,
        default: ''
      }
    },
    favicon: {
      url: {
        type: String,
        default: ''
      },
      publicId: {
        type: String,
        default: ''
      }
    },
    contactEmail: {
      type: String,
      default: ''
    },
    contactPhone: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    socialLinks: {
      facebook: { type: String, default: '' },
      twitter: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      instagram: { type: String, default: '' },
      youtube: { type: String, default: '' }
    },
    seoSettings: {
      metaTitle: { type: String, default: '' },
      metaDescription: { type: String, default: '' },
      metaKeywords: { type: [String], default: [] },
      googleAnalyticsId: { type: String, default: '' }
    },
    adsPerPage: {
      type: Number,
      default: 12
    },
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    footerText: {
      type: String,
      default: '© 2024 Job Ads Aggregator. All rights reserved.'
    }
  },
  {
    timestamps: true
  }
);

// Ensure only one settings document exists
siteSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);