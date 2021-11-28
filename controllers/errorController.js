const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  //Get the duplicated value
  const value = Object.values(err.keyValue)[0];

  // console.log(value);
  const message = `Duplicate field value: "${value}", Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  console.log(errors);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJwtError = () =>
  new AppError('Invalid token! Please login again.', 401);
const handleJwtExpiredError = () =>
  new AppError('Your token has expired! Please login again.', 401);

//Development Enviroment Errors
const sendDevError = (err, req, res) => {
  //API ERRORS
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    //RENDERED VIEWS ERROR
    console.error('ERROR🔥:', err);
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
};

//Production Enviroment Errors
const sendProdError = (err, req, res) => {
  //API ERRORS
  if (req.originalUrl.startsWith('/api')) {
    //Operational errors, trusted errors: send message to the client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });

      //Programming or other unknown error: don't leak error details to client
    }
    //1) Log Error
    console.error('ERROR🔥:', err);

    //2)Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something Went Wrong!',
    });
  }

  //RENDERED VIEWS ERROR
  if (err.isOperational) {
    console.log(err);
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Error! Please try agian later.',
  });
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendDevError(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    // console.log('ERR Name Is🔥🔥🔥🔥: ', err.name);

    //Solution1: Use object.assign instead of destructuring the object, but this will not clone the object it will only take a reference.
    // let error = Object.assign(err);

    //Solution2: we can copy the name from the original object manually to the clone, Best Solution So Far
    let error = { ...err };
    error.name = err.name;
    error.message = err.message;

    // console.log('Error Name is 🔥🔥', error.name);

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJwtError();
    if (error.name === 'TokenExpiredError') error = handleJwtExpiredError();

    sendProdError(error, req, res);
  }
};
