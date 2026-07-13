const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const generateToken = require('../utils/generateToken');
const {
  sendEmail,
  getPasswordResetTemplate,
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

const signup = async function (req, res) {
  try {
    const { name, email, password, secretKey } = req.body;

    if (secretKey !== process.env.ADMIN_SIGNUP_SECRET) {
      return res.status(403).json({
        success: false,
        message: 'Invalid secret key. You are not authorized to create an admin account.'
      });
    }

    const existingAdmin = await Admin.findOne({});
    if (existingAdmin) {
      return res.status(403).json({
        success: false,
        message: 'An admin account already exists. Signup is disabled. Please use login.'
      });
    }

    const emailExists = await Admin.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    const hashedPassword = await hashPassword(password);

    const admin = new Admin({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'superadmin',
      isActive: true
    });

    await admin.save();

    const token = generateToken(admin._id);

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully. This signup endpoint is now permanently disabled.',
      data: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          createdAt: admin.createdAt
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Signup failed',
      error: error.message
    });
  }
};

const login = async function (req, res) {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Contact support.'
      });
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          profilePicture: admin.profilePicture,
          lastLogin: admin.lastLogin
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

const getMe = async function (req, res) {
  try {
    const admin = await Admin.findById(req.admin._id);

    res.status(200).json({
      success: true,
      message: 'Admin profile fetched successfully',
      data: { admin }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

const forgotPassword = async function (req, res) {
  try {
    const { email } = req.body;

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'No admin found with that email address'
      });
    }

    const resetToken = admin.createPasswordResetToken();
    await admin.save();

    const resetUrl = process.env.FRONTEND_URL + '/reset-password/' + resetToken;

    try {
      await sendEmail({
        to: admin.email,
        subject: 'Password Reset Request - Job Ads Aggregator',
        html: getPasswordResetTemplate(admin.name, resetUrl)
      });

      res.status(200).json({
        success: true,
        message: 'Password reset link sent to ' + admin.email
      });
    } catch (emailError) {
      admin.passwordResetToken = undefined;
      admin.passwordResetExpires = undefined;
      await admin.save();

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Forgot password failed',
      error: error.message
    });
  }
};

const resetPassword = async function (req, res) {
  try {
    const { password } = req.body;

    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const admin = await Admin.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const hashedPassword = await hashPassword(password);

    admin.password = hashedPassword;
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    admin.passwordChangedAt = new Date(Date.now() - 1000);
    await admin.save();

    try {
      await sendEmail({
        to: admin.email,
        subject: 'Password Changed Successfully - Job Ads Aggregator',
        html: getPasswordChangedTemplate(admin.name)
      });
    } catch (emailError) {
      console.log('Confirmation email failed: ' + emailError.message);
    }

    const token = generateToken(admin._id);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
      data: { token }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
};

const verifyResetToken = async function (req, res) {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const admin = await Admin.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Token verification failed',
      error: error.message
    });
  }
};

const logout = async function (req, res) {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

module.exports = {
  signup,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  logout
};