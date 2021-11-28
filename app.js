const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.enable('trust proxy');

//Set the template engine (Pug.js)
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//1. GLOBAL MIDDLEWARE STACK

//Implement CORS
app.use(cors());

// Implement CORS for complex requests
// Respons to options requests
// (Options is an http method like GET, POST, PATCH, DELETE, ETC...)
app.options('*', cors());

//Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet());

//Mapbox error solution
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:'],
      scriptSrc: ["'self'", 'https:', 'http:', 'blob:'],
      styleSrc: ["'self'", 'https:', 'http:', 'unsafe-inline'],
    },
  })
);

// Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//Limit requests from same API (Rate-Limiting)
const limiter = rateLimit({
  //maximum requests limit
  max: 100,
  //Timeframe for requests limit in milliseconds
  windowMs: 60 * 60 * 1000,
  //requests limit
  message: 'Too many request from this IP, Please try again in an hour!',
});
app.use('/api', limiter);

// Body-parser, reading data from the body into req.body
app.use(express.json({ limit: '10kb' }));

//CookieParser
app.use(cookieParser());

//Data sanitization against NoSQL query injection
app.use(mongoSanitize());

//Data sanitization against Cross-Site-Scripting attacks (XSS)
app.use(xss());

//Prevent Parameter Pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

//Compress all the text that is going to be sent to client
app.use(compression());

// Test Middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

//2. ROUTES (Mounting the routers)
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
