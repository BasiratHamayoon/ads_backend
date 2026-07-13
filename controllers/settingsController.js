const Admin = require('../models/Admin');
const SiteSettings = require('../models/SiteSettings');
const bcrypt = require('bcryptjs');
const {
  uploadProfilePicture,
  uploadFromBuffer,
  deleteFromCloudinary
} = require('../config/cloudinary');
const {
  sendEmail,
  getPasswordChangedTemplate
} = require('../utils/sendEmail');

const hashPassword = function (plainPassword) {
  return new Promise(function (resolve, reject) {
    bcrypt.genSalt(12, function (saltErr, salt) {
      if (saltErr) {
        return reject(saltErr);
      }
      bcrypt.hash(plainPassword, salt, function (hashErr, hash) {
        if (hashErr) {
          return reject(hashErr);
        }
        return resolve(hash);
      });
    });
  });
};

const updateProfile = async function (req, res) {
  try {
    const { name, email, phone, bio } = req.body;

    if (email && email !== req.admin.email) {
      const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;

    const admin = await Admin.findByIdAndUpdate(req.admin._id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { admin }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

const updateProfilePicture = async function (req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a profile picture'
      });
    }

    const admin = await Admin.findById(req.admin._id);

    if (admin.profilePicture && admin.profilePicture.publicId) {
      await deleteFromCloudinary(admin.profilePicture.publicId);
    }

    const result = await uploadProfilePicture(req.file.buffer);

    admin.profilePicture = {
      url: result.secure_url,
      publicId: result.public_id
    };

    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        profilePicture: admin.profilePicture
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile picture',
      error: error.message
    });
  }
};

const removeProfilePicture = async function (req, res) {
  try {
    const admin = await Admin.findById(req.admin._id);

    if (admin.profilePicture && admin.profilePicture.publicId) {
      await deleteFromCloudinary(admin.profilePicture.publicId);
    }

    admin.profilePicture = { url: '', publicId: '' };
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove profile picture',
      error: error.message
    });
  }
};

const changePassword = async function (req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    const admin = await Admin.findById(req.admin._id).select('+password');

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const isSame = await admin.comparePassword(newPassword);
    if (isSame) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    const hashedPassword = await hashPassword(newPassword);

    admin.password = hashedPassword;
    admin.passwordChangedAt = new Date(Date.now() - 1000);
    await admin.save();

    try {
      await sendEmail({
        to: admin.email,
        subject: 'Password Changed Successfully - Job Ads Aggregator',
        html: getPasswordChangedTemplate(admin.name)
      });
    } catch (emailError) {
      console.log('Password change confirmation email failed: ' + emailError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again with your new password.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

const getSiteSettings = async function (req, res) {
  try {
    const settings = await SiteSettings.getSettings();

    res.status(200).json({
      success: true,
      message: 'Site settings fetched successfully',
      data: { settings }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch site settings',
      error: error.message
    });
  }
};

const updateSiteSettings = async function (req, res) {
  try {
    const settings = await SiteSettings.getSettings();

    const {
      siteName,
      siteDescription,
      contactEmail,
      contactPhone,
      address,
      socialLinks,
      seoSettings,
      adsPerPage,
      maintenanceMode,
      footerText
    } = req.body;

    if (siteName) settings.siteName = siteName;
    if (siteDescription) settings.siteDescription = siteDescription;
    if (contactEmail) settings.contactEmail = contactEmail;
    if (contactPhone !== undefined) settings.contactPhone = contactPhone;
    if (address !== undefined) settings.address = address;
    if (adsPerPage) settings.adsPerPage = adsPerPage;
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
    if (footerText) settings.footerText = footerText;

    if (socialLinks) {
      const currentSocial = settings.socialLinks ? settings.socialLinks.toObject() : {};
      settings.socialLinks = Object.assign({}, currentSocial, socialLinks);
    }

    if (seoSettings) {
      const currentSeo = settings.seoSettings ? settings.seoSettings.toObject() : {};
      settings.seoSettings = Object.assign({}, currentSeo, seoSettings);
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Site settings updated successfully',
      data: { settings }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update site settings',
      error: error.message
    });
  }
};

const updateSiteLogo = async function (req, res) {
  try {
    const settings = await SiteSettings.getSettings();

    if (req.files) {
      if (req.files.siteLogo && req.files.siteLogo[0]) {
        if (settings.siteLogo && settings.siteLogo.publicId) {
          await deleteFromCloudinary(settings.siteLogo.publicId);
        }
        const result = await uploadFromBuffer(
          req.files.siteLogo[0].buffer,
          'job-ads-aggregator/site'
        );
        settings.siteLogo = {
          url: result.secure_url,
          publicId: result.public_id
        };
      }

      if (req.files.favicon && req.files.favicon[0]) {
        if (settings.favicon && settings.favicon.publicId) {
          await deleteFromCloudinary(settings.favicon.publicId);
        }
        const result = await uploadFromBuffer(
          req.files.favicon[0].buffer,
          'job-ads-aggregator/site'
        );
        settings.favicon = {
          url: result.secure_url,
          publicId: result.public_id
        };
      }
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Site logo updated successfully',
      data: {
        siteLogo: settings.siteLogo,
        favicon: settings.favicon
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update site logo',
      error: error.message
    });
  }
};

module.exports = {
  updateProfile,
  updateProfilePicture,
  removeProfilePicture,
  changePassword,
  getSiteSettings,
  updateSiteSettings,
  updateSiteLogo
};