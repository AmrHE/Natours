const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');

//Middleware to check user and tour IDs
exports.setTourUserIds = (req, res, next) => {
  //Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  //we got req.user from the protect/restrictTo middlewares
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

//1- Get all reviews route handler
exports.getAllReviews = factory.getAll(Review);

//2-Create Review Route Handler Using Factory Function
exports.createReview = factory.createOne(Review);

//3- Delete Review Route Handler Using Factory Function
exports.deleteReview = factory.deleteOne(Review);

//4-Update Review Route Handler Using Factory Functioon
exports.updateReview = factory.updateOne(Review);

//5-Get Review Route Handler Using Factory Function
exports.getReview = factory.getOne(Review);
