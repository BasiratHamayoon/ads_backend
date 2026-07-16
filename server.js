const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const path = require('path');

dotenv.config();

const connectDB = require('./config/db');
connectDB();

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const jobAdRoutes = require('./routes/jobAdRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const contactRoutes = require('./routes/contactRoutes');

const { errorHandler, notFound } = require('./middlewares/errorHandler');

const app = express();

var allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:4000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

if (process.env.ADMIN_URL) {
  allowedOrigins.push(process.env.ADMIN_URL);
}

if (process.env.USER_URL) {
  allowedOrigins.push(process.env.USER_URL);
}

var corsOptions = {
  origin: function (origin, callback) {
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' }
}));

app.use(hpp());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes'
  }
});
app.use('/api/v1/auth', authLimiter);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(compression());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/v1', function (req, res) {
  res.status(200).json({
    success: true,
    message: 'Job Ads Aggregator API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      categories: '/api/v1/categories',
      jobAds: '/api/v1/job-ads',
      dashboard: '/api/v1/dashboard',
      settings: '/api/v1/settings',
      contacts: '/api/v1/contacts'
    }
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/job-ads', jobAdRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/contacts', contactRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, function () {
  console.log('Server running in ' + process.env.NODE_ENV + ' mode on port ' + PORT);
  console.log('API Base URL: http://localhost:' + PORT + '/api/v1');
  console.log('Allowed Origins: ' + allowedOrigins.join(', '));
});

process.on('unhandledRejection', function (err) {
  console.log('Unhandled Rejection: ' + err.message);
  server.close(function () {
    process.exit(1);
  });
});

process.on('uncaughtException', function (err) {
  console.log('Uncaught Exception: ' + err.message);
  process.exit(1);
});

module.exports = app;