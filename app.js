const bodyParser = require('body-parser');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const http = require('http');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');

// Routers
const cpvRouter = require('./routes/cpvRoutes');
const organizationRouter = require('./routes/organizationRoutes');
const runnableRouter = require('./routes/runnableRoutes');
const tenderRouter = require('./routes/tenderRoutes');

const router = express.Router();

// CORS related
router.use(cors());
router.options('*', cors());

// Set security HTTP headers
router.use(helmet());

if (process.env.NODE_ENV === 'development') {
  // Development
  router.use(morgan('dev')); // Development logging
}

// Limit requests from same API
// const limiter = rateLimit({
//     max: 100,
//     windowMs: 60 * 60 * 1000,
//     message: 'Too many requests from this IP, please try again in an hour!'
// });
// app.use('/api', limiter);

// Body parser, reading data from body into req.body
router.use(express.json());
router.use(express.urlencoded({ extended: true, limit: '10kb' }));
router.use(cookieParser());

// Data sanitization against NoSQL query injection
router.use(mongoSanitize());

// Data sanitization against XSS
router.use(xss());

router.use(compression());

// Routes
router.use('/v1/cpvs', cpvRouter);
router.use('/v1/organizations', organizationRouter);
router.use('/v1/runnables', runnableRouter);
router.use('/v1/tenders', tenderRouter);

module.exports = legacyRouter;
