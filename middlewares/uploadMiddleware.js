const multer = require('multer');

// Use memory storage (for cloudinary upload from buffer)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, GIF, and WEBP are allowed.'), false);
  }
};

// Single image upload
const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
}).single('image');

// Multiple images upload
const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB per file
  }
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 5 },
  { name: 'companyLogo', maxCount: 1 }
]);

// Profile picture upload
const uploadProfile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3MB
  }
}).single('profilePicture');

// Site logo upload
const uploadLogo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
}).fields([
  { name: 'siteLogo', maxCount: 1 },
  { name: 'favicon', maxCount: 1 }
]);

// Error handling wrapper
const handleUploadError = (uploadFunction) => {
  return (req, res, next) => {
    uploadFunction(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size allowed is 5MB.'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files uploaded.'
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

module.exports = {
  uploadSingle: handleUploadError(uploadSingle),
  uploadMultiple: handleUploadError(uploadMultiple),
  uploadProfile: handleUploadError(uploadProfile),
  uploadLogo: handleUploadError(uploadLogo)
};