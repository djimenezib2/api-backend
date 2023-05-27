const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const xss = require('xss-clean');

// Routers
const cpvRouter = require('./routes/cpvRoutes');
const organizationRouter = require('./routes/organizationRoutes');
const runnableRouter = require('./routes/runnableRoutes');
const tenderRouter = require('./routes/tenderRoutes');
const errorRouter = require('./routes/errorRoutes');
const userRouter = require('./routes/userRoutes');
const globalErrorHandler = require('./controllers/globalErrorHandler');

const router = express();

// CORS related
const corsOptions = {
  origin: 'http://localhost:8080',
  credentials: true, // Allow credentials (cookies)
};

router.use(cors(corsOptions));

// Set security HTTP headers
router.use(helmet());

if (process.env.NODE_ENV === 'development') {
  // Development
  router.use(morgan('dev'));
}

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
router.use('/v1/errors', errorRouter);
router.use('/v1/users', userRouter);

router.use(globalErrorHandler);

module.exports = router;
