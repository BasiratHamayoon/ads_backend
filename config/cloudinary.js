const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload to cloudinary from buffer
const uploadFromBuffer = (fileBuffer, folder = 'job-ads-aggregator') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 630, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const streamifier = require('streamifier');
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// Upload profile picture
const uploadProfilePicture = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'job-ads-aggregator/profiles',
        resource_type: 'image',
        transformation: [
          { width: 300, height: 300, crop: 'fill', gravity: 'face' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const streamifier = require('streamifier');
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// Delete from cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadFromBuffer,
  uploadProfilePicture,
  deleteFromCloudinary
};