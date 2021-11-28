const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

//Multer file storage/distination config
// const multerStorage = multer.diskStorage({
//   destination: (req, file, callbackFN) => {
//     callbackFN(null, 'public/img/users');
//   },
//   filename: (req, file, callbackFN) => {
//     const extenstion = file.mimetype.split('/')[1];
//     callbackFN(null, `user-${req.user.id}-${Date.now()}.${extenstion}`);
//   },
// });

//Multer file memory to store the image as a buffer
const multerStorage = multer.memoryStorage();

//Multer file filter config
const multerFilter = (req, file, callbackFN) => {
  if (
    file.mimetype.split('/')[0] === 'image' ||
    file.mimetype.startsWith('image')
  ) {
    callbackFN(null, true);
  } else {
    callbackFN(
      new AppError(
        'File you uploaded is not an image! Please upload only images',
        400
      ),
      false
    );
  }
};

//multer function
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
//middleware created from multer function to be called in the Router
exports.uploadUserPhoto = upload.single('photo');

//Middelware to resize the uploaded users image
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

//Object Filtering Algorithm (PURE JAVASCRIPT)
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

/* USERS ROUTES HANDLERS */
//1. Create user route handler
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'Error',
    message: 'This route is not defined! Please use /signup instead',
  });
};

//2. GET all users route handler
exports.getAllUsers = factory.getAll(User);

//3. Get user route handler
exports.getUser = factory.getOne(User);

//4. Update user route handler
//Do NOT update passwords with this handler (for admins only)
exports.updateUser = factory.updateOne(User);

//5. Delete user route handler
exports.deleteUser = factory.deleteOne(User);

//Middleware to copy the userId to the req.params
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

//6. Update Me middleware (Allows a user to update his own data)
exports.updateMe = catchAsync(async (req, res, next) => {
  console.log(req.file);
  console.log(req.body);

  //1) Throw an error if user tries to updates the password (Basically POSTed password data )
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates, please user /updateMyPassword instead',
        400
      )
    );
  }

  //2) Filtered out unwanted field names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');

  if (req.file) filteredBody.photo = req.file.filename;

  //3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

//7. Delete Me middleware (allows user to deactivate his account)
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
