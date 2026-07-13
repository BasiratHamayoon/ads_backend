const express = require('express');
const router = express.Router();

const {
  submitContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  replyToContact,
  addAdminNote,
  deleteContact,
  bulkDeleteContacts,
  bulkUpdateStatus,
  getContactStats
} = require('../controllers/contactController');

const { protect } = require('../middlewares/authMiddleware');

const {
  createContactValidator,
  replyContactValidator,
  updateStatusValidator
} = require('../validators/contactValidator');

const validateRequest = require('../middlewares/validateRequest');

router.post('/', createContactValidator, validateRequest, submitContact);

router.use(protect);

router.get('/stats', getContactStats);
router.get('/', getAllContacts);
router.get('/:id', getContactById);
router.patch('/:id/status', updateStatusValidator, validateRequest, updateContactStatus);
router.post('/:id/reply', replyContactValidator, validateRequest, replyToContact);
router.patch('/:id/note', addAdminNote);
router.delete('/bulk-delete', bulkDeleteContacts);
router.patch('/bulk-status', bulkUpdateStatus);
router.delete('/:id', deleteContact);

module.exports = router;