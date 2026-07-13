const express = require('express');
const router = express.Router();

const settingsController = require('../controllers/settingsController');
const { protect } = require('../middlewares/authMiddleware');
const { uploadProfile, uploadLogo } = require('../middlewares/uploadMiddleware');
const { changePasswordValidator } = require('../validators/authValidator');
const validateRequest = require('../middlewares/validateRequest');

router.get('/site', settingsController.getSiteSettings);

router.use(protect);

router.put('/profile', settingsController.updateProfile);
router.put('/profile-picture', uploadProfile, settingsController.updateProfilePicture);
router.delete('/profile-picture', settingsController.removeProfilePicture);
router.put('/change-password', changePasswordValidator, validateRequest, settingsController.changePassword);

router.put('/site', settingsController.updateSiteSettings);
router.put('/site/logo', uploadLogo, settingsController.updateSiteLogo);

module.exports = router;