const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

//Create users Mongoose Schema
const userSchema = new mongoose.Schema(
  //Schema definition object
  {
    name: {
      type: String,
      required: [true, 'Please enter your name.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please enter your email.'],
      unique: [true, 'This Email has been already used.'],
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email!'],
    },
    photo: {
      type: String,
      default: 'default.jpg',
    },
    role: {
      type: String,
      enum: ['user', 'guide', 'lead-guide', 'admin'],
      default: 'user',
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password is too short'],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        //This only works on "CREATE" and "SAVE" method
        validator: function (el) {
          return el === this.password;
        },
        message: "The passowrd doesn't match",
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  }
);

//DOCUMENT MIDDLEWARE: runs before .save() and .create()
//PRE-SAVE DOCUMENT MIDDLEWARE (Pre-Save Hooks)
//This Hook/Middleware runs between getting the data, and saving it to database
userSchema.pre('save', async function (next) {
  //Only run this func if password was modified
  if (!this.isModified('password')) return next();

  //Encrypt OR Hash the password with cost parameter of "12"
  this.password = await bcrypt.hash(this.password, 12);

  //Delete passwordConfirm from our database
  //{as we have the hashed password in our DB,
  //we don't want to save this "passwordConfirm" field}
  this.passwordConfirm = undefined;
  next();
});

//Pre-Save middleware to update the passwordChangeAt property
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//Delete inactive users from GetAllUsers query
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

//Static Instance Method
//(Check if the password is correct or not)
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//Static Instance Method
//(Check if the password is changed or not after the JWT is issued/created)
userSchema.methods.changedPasswordAfterJWT = function (JWTTimeStamp) {
  // console.log(this);
  // console.log('passwordChangedAt: ', this.passwordChangedAt);
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // console.log(changedTimeStamp, JWTTimeStamp);
    return JWTTimeStamp < changedTimeStamp;
  }
  //False means that password NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 3 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
