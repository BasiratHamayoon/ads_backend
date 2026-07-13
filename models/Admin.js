const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email'
      ]
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false
    },
    profilePicture: {
      url: {
        type: String,
        default: ''
      },
      publicId: {
        type: String,
        default: ''
      }
    },
    phone: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: '',
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    role: {
      type: String,
      default: 'admin',
      enum: ['admin', 'superadmin']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: null
    },
    passwordChangedAt: {
      type: Date
    },
    passwordResetToken: {
      type: String
    },
    passwordResetExpires: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

adminSchema.methods.comparePassword = function (candidatePassword) {
  const hashedPassword = this.password;
  return new Promise(function (resolve, reject) {
    bcrypt.compare(candidatePassword, hashedPassword, function (err, isMatch) {
      if (err) {
        return reject(err);
      }
      return resolve(isMatch);
    });
  });
};

adminSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);

  return resetToken;
};

adminSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

module.exports = mongoose.model('Admin', adminSchema);