const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Admin = require('../models/Admin');

async function seedAdmin() {
  if (!process.env.MONGODB_URI) {
    console.log('MONGODB_URI is missing from .env file');
    process.exit(1);
  }

  if (!process.env.ADMIN_EMAIL) {
    console.log('ADMIN_EMAIL is missing from .env file');
    process.exit(1);
  }

  if (!process.env.ADMIN_PASSWORD) {
    console.log('ADMIN_PASSWORD is missing from .env file');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');

    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Connected to MongoDB successfully');

    const existingAdmin = await Admin.findOne({
      email: process.env.ADMIN_EMAIL.toLowerCase()
    });

    if (existingAdmin) {
      console.log('Admin already exists with this email: ' + existingAdmin.email);
      console.log('To create a new admin change ADMIN_EMAIL in .env file');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('Creating admin account...');

    const adminData = {
      name: process.env.ADMIN_NAME || 'Super Admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'superadmin',
      isActive: true
    };

    const admin = new Admin(adminData);

    await admin.save();

    console.log('Admin created successfully');
    console.log('Name: ' + admin.name);
    console.log('Email: ' + admin.email);
    console.log('Role: ' + admin.role);
    console.log('ID: ' + admin._id);
    console.log('Password: ' + process.env.ADMIN_PASSWORD);
    console.log('Please change the password after first login');

    await mongoose.disconnect();

    console.log('Database connection closed');
    process.exit(0);

  } catch (error) {
    console.log('Error: ' + error.message);
    console.log('Stack: ' + error.stack);

    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.log('Disconnect error: ' + disconnectError.message);
    }

    process.exit(1);
  }
}

seedAdmin();