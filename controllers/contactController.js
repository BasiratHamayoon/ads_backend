const Contact = require('../models/Contact');
const { sendEmail } = require('../utils/sendEmail');

const getContactReceivedTemplate = (name, subject, message, email, phone) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1a73e8, #0d47a1); padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; }
        .body { padding: 30px; }
        .body p { color: #555; line-height: 1.8; font-size: 15px; }
        .info-box { background: #f8f9fa; border-left: 4px solid #1a73e8; padding: 15px 20px; border-radius: 4px; margin: 15px 0; }
        .info-box p { margin: 5px 0; color: #333; }
        .label { font-weight: bold; color: #1a73e8; }
        .message-box { background: #f0f4ff; padding: 20px; border-radius: 8px; margin-top: 15px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Contact Message Received</h1>
        </div>
        <div class="body">
          <p>You have received a new contact message. Details below:</p>
          <div class="info-box">
            <p><span class="label">Name:</span> ${name}</p>
            <p><span class="label">Email:</span> ${email}</p>
            <p><span class="label">Phone:</span> ${phone || 'Not provided'}</p>
            <p><span class="label">Subject:</span> ${subject}</p>
          </div>
          <div class="message-box">
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          </div>
        </div>
        <div class="footer">
          <p>Job Ads Aggregator Admin Panel</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getContactAutoReplyTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #28a745, #1e7e34); padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; }
        .body { padding: 30px; }
        .body p { color: #555; line-height: 1.8; font-size: 15px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Message Received</h1>
        </div>
        <div class="body">
          <p>Dear ${name},</p>
          <p>Thank you for reaching out to us. We have received your message and our team will get back to you within 24 to 48 hours.</p>
          <p>If your matter is urgent, please feel free to contact us directly.</p>
          <p>Best regards,<br>Job Ads Aggregator Team</p>
        </div>
        <div class="footer">
          <p>Job Ads Aggregator &copy; ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getReplyToSenderTemplate = (name, originalSubject, replyMessage) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1a73e8, #0d47a1); padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; }
        .body { padding: 30px; }
        .body p { color: #555; line-height: 1.8; font-size: 15px; }
        .reply-box { background: #f0f4ff; padding: 20px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #1a73e8; }
        .subject-box { background: #f8f9fa; padding: 10px 15px; border-radius: 4px; margin-bottom: 15px; font-size: 14px; color: #666; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reply to Your Message</h1>
        </div>
        <div class="body">
          <p>Dear ${name},</p>
          <p>We have replied to your inquiry. See our response below:</p>
          <div class="subject-box">
            Regarding: ${originalSubject}
          </div>
          <div class="reply-box">
            <p>${replyMessage}</p>
          </div>
          <p style="margin-top: 25px;">Best regards,<br>Job Ads Aggregator Team</p>
        </div>
        <div class="footer">
          <p>Job Ads Aggregator &copy; ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    const ipAddress =
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      '';

    const contact = await Contact.create({
      name,
      email,
      phone: phone || '',
      subject,
      message,
      ipAddress: ipAddress.toString().split(',')[0].trim()
    });

    try {
      if (process.env.EMAIL_USER) {
        await sendEmail({
          to: process.env.EMAIL_USER,
          subject: 'New Contact Message: ' + subject,
          html: getContactReceivedTemplate(name, subject, message, email, phone)
        });
      }
    } catch (adminEmailError) {
      console.log('Admin notification email failed: ' + adminEmailError.message);
    }

    try {
      await sendEmail({
        to: email,
        subject: 'We received your message - Job Ads Aggregator',
        html: getContactAutoReplyTemplate(name)
      });
    } catch (autoReplyError) {
      console.log('Auto reply email failed: ' + autoReplyError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.',
      data: {
        contact: {
          _id: contact._id,
          name: contact.name,
          email: contact.email,
          subject: contact.subject,
          createdAt: contact.createdAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact message',
      error: error.message
    });
  }
};

const getAllContacts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { subject: searchRegex }
      ];
    }

    const totalCount = await Contact.countDocuments(filter);

    const contacts = await Contact.find(filter)
      .populate('repliedBy', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCount / limit);

    const unreadCount = await Contact.countDocuments({ status: 'unread' });
    const readCount = await Contact.countDocuments({ status: 'read' });
    const repliedCount = await Contact.countDocuments({ status: 'replied' });
    const archivedCount = await Contact.countDocuments({ status: 'archived' });

    res.status(200).json({
      success: true,
      message: 'Contacts fetched successfully',
      count: contacts.length,
      data: {
        contacts,
        statusCounts: {
          unread: unreadCount,
          read: readCount,
          replied: repliedCount,
          archived: archivedCount,
          total: totalCount
        }
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
      error: error.message
    });
  }
};

const getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id).populate(
      'repliedBy',
      'name email'
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    if (contact.status === 'unread') {
      contact.status = 'read';
      await contact.save();
    }

    res.status(200).json({
      success: true,
      message: 'Contact fetched successfully',
      data: { contact }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact',
      error: error.message
    });
  }
};

const updateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    contact.status = status;
    await contact.save();

    res.status(200).json({
      success: true,
      message: 'Contact status updated to ' + status,
      data: { contact }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update contact status',
      error: error.message
    });
  }
};

const replyToContact = async (req, res) => {
  try {
    const { replyMessage } = req.body;

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    if (contact.status === 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reply to an archived message'
      });
    }

    await sendEmail({
      to: contact.email,
      subject: 'Re: ' + contact.subject + ' - Job Ads Aggregator',
      html: getReplyToSenderTemplate(contact.name, contact.subject, replyMessage)
    });

    contact.status = 'replied';
    contact.repliedAt = new Date();
    contact.repliedBy = req.admin._id;
    await contact.save();

    await contact.populate('repliedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Reply sent successfully to ' + contact.email,
      data: { contact }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send reply',
      error: error.message
    });
  }
};

const addAdminNote = async (req, res) => {
  try {
    const { adminNote } = req.body;

    if (!adminNote || adminNote.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Admin note cannot be empty'
      });
    }

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    contact.adminNote = adminNote;
    await contact.save();

    res.status(200).json({
      success: true,
      message: 'Admin note saved successfully',
      data: { contact }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to save admin note',
      error: error.message
    });
  }
};

const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    await Contact.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Contact message deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact message',
      error: error.message
    });
  }
};

const bulkDeleteContacts = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of contact IDs'
      });
    }

    const result = await Contact.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: result.deletedCount + ' contact message(s) deleted successfully',
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete contacts',
      error: error.message
    });
  }
};

const bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of contact IDs'
      });
    }

    if (!['unread', 'read', 'replied', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const result = await Contact.updateMany(
      { _id: { $in: ids } },
      { status }
    );

    res.status(200).json({
      success: true,
      message: result.modifiedCount + ' contact(s) updated to ' + status,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update contacts',
      error: error.message
    });
  }
};

const getContactStats = async (req, res) => {
  try {
    const totalContacts = await Contact.countDocuments();
    const unreadContacts = await Contact.countDocuments({ status: 'unread' });
    const readContacts = await Contact.countDocuments({ status: 'read' });
    const repliedContacts = await Contact.countDocuments({ status: 'replied' });
    const archivedContacts = await Contact.countDocuments({ status: 'archived' });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last7Days = await Contact.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    const last30Days = await Contact.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyTrends = await Contact.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          count: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Contact stats fetched successfully',
      data: {
        overview: {
          total: totalContacts,
          unread: unreadContacts,
          read: readContacts,
          replied: repliedContacts,
          archived: archivedContacts
        },
        period: {
          last7Days,
          last30Days
        },
        monthlyTrends
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact stats',
      error: error.message
    });
  }
};

module.exports = {
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
};