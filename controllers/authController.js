const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

//Function TO Create The Toekn
// eslint-disable-next-line arrow-body-style
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

//Function to SEND the created token from the above function to the client
const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    //convert the date from days to milliseconds
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    //This option means that the cookie will only be send on encrypted connection (HTTPS)
    // secure: true,

    //This option makes the cookie cannot be accessed or modified in the browser
    httpOnly: true,
  };

  //we use this instead of specifying it in the object
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  //To hide the password from the res object
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token: token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  // console.log(url);

  await new Email(newUser, url).sendWelcome();
  createAndSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) Check if email and password exist
  if (!email || !password) {
    return next(
      new AppError('Please provide your email address and password', 400)
    );
  }

  //2)Check if the user exists && if the password is correct
  const user = await User.findOne({ email: email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect Email or password', 401));
  }

  //3)If everything is ok, send token to client
  createAndSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'Logged out', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status('200').json({ status: 'success' });
};

//Check if the user is logged in or not, and if so, check if the user exists or not FOR PROTECTED ROUTES
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get the token and check if it exists
  let token;

  //1.1) Get the token from the req.headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  //1.2) Check if it exists or not
  if (!token) {
    return next(
      new AppError('You are not logged in! Please login to get access.', 401)
    );
  }

  // 2) Verify/Validate the token (Verify if someone manipulated the data) OR (If the token has already expired)
  const decodedPayload = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );

  // console.log('ID: ', decodedPayload.id);

  // 3) Check if user still exists //(or has been deleted from DB after the JWT has created/issued)
  const currentUser = await User.findById(decodedPayload.id);

  if (!currentUser) {
    return next(new AppError('The user does no longer exist', 401));
  }

  // 4) Check if the user changed password after the JWT is created/issued
  if (currentUser.changedPasswordAfterJWT(decodedPayload.iat)) {
    return next(
      new AppError(
        'User recently changed the password! Please login again.',
        401
      )
    );
  }

  //GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser; //Here we pass the currentUser to the req object in order to make this data avilable in the next middleware of the middleware stake
  res.locals.user = currentUser; //Here we pass the currentUser to the res.locals in order to make this data available in the every and each pug template as they all have access to res.locals

  next();
});

//To Check if the user is logged in or not (Only for rendered pages so there will never errors)
//(For the view templates to be able to render the { signin/login buttons || user data } conditionally)
exports.isLoggedIn = async (req, res, next) => {
  //1) Check if there is a token/cookie called jwt
  if (req.cookies.jwt) {
    try {
      // 2) Verify/Validate the token (Verify if someone manipulated the data) OR (If the token has already expired)
      const decodedPayload = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 3) Check if user still exists //(or has been deleted from DB after the JWT has created/issued)
      const currentUser = await User.findById(decodedPayload.id);

      if (!currentUser) {
        return next();
      }

      // 4) Check if the user changed password after the JWT is created/issued
      if (currentUser.changedPasswordAfterJWT(decodedPayload.iat)) {
        return next();
      }

      //GRANT ACCESS TO PROTECTED ROUTE && There is a logged in user
      res.locals.user = currentUser; //Here we pass the currentUser to the res.locals in order to make this data available in the every and each pug template as they all have access to res.locals
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// eslint-disable-next-line arrow-body-style
exports.restrictTo = (...roles) => {
  //authorized roles are ['admin', 'lead-guide']
  //as we pass to the middleware in the tourRoutes.
  return (req, res, next) => {
    //if the role is not included in the roles array
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have a premission to perform this action', 403)
      );
    }
    next();
  };
};

//Password Reset procedures
//1-user sends a post requrest to the forgotPassword route only with his email address
//2-This will create a reset "regular" token and send it to the provided email address
// 3-Then the user sends that token along with his new password from his email

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that Email Address', 404));
  }

  //2)Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  // console.log({ resetToken });
  await user.save({ validateBeforeSave: false });

  try {
    //3)Send the token back as an email
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email, Try again later!',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2) Set new password, If there is a user, and the token is not expired

  if (!user) {
    return next(new AppError('Invalid or Expired Token', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  //3) Update changedPasswordAt property for the user

  //4) Log the user in by sending the JWT to the client
  createAndSendToken(user, 200, res);
});

// allow logged-in users to update their passwords without fogetting it
exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get the user from collection
  const user = await User.findById(req.user._id).select('+password');

  //2) Check if POSTed current password is correct or not
  // if (user.password !== req.body.password) {
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(
      new AppError(
        'Wrong password! Please enter the correct password to proceed.',
        401
      )
    );
  }

  //3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();

  //4) Log the user it by sending the JWT to client
  createAndSendToken(user, 200, res);
});
