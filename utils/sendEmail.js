const createTransporter = require('../config/email');

const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error('Email could not be sent');
  }
};

// Password Reset Email Template
const getPasswordResetTemplate = (name, resetUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1a73e8, #0d47a1); padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
        .body { padding: 40px 30px; }
        .body h2 { color: #333; margin-top: 0; }
        .body p { color: #555; line-height: 1.8; font-size: 15px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #1a73e8, #0d47a1); color: #ffffff !important; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 13px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 6px; margin-top: 20px; color: #856404; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="body">
          <h2>Hello ${name},</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="btn">Reset Password</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px; font-size: 13px;">${resetUrl}</p>
          <div class="warning">
            ⚠️ This link will expire in <strong>30 minutes</strong>. If you didn't request this reset, please ignore this email.
          </div>
        </div>
        <div class="footer">
          <p>Job Ads Aggregator &copy; ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Password Changed Confirmation Template
const getPasswordChangedTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #28a745, #1e7e34); padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
        .body { padding: 40px 30px; }
        .body h2 { color: #333; margin-top: 0; }
        .body p { color: #555; line-height: 1.8; font-size: 15px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Password Changed Successfully</h1>
        </div>
        <div class="body">
          <h2>Hello ${name},</h2>
          <p>Your password has been successfully changed.</p>
          <p>If you did not make this change, please contact support immediately.</p>
        </div>
        <div class="footer">
          <p>Job Ads Aggregator &copy; ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  sendEmail,
  getPasswordResetTemplate,
  getPasswordChangedTemplate
};