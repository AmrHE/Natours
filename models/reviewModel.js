const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  //Schema difintion Object
  {
    //1- Review
    review: {
      type: String,
      //Don't forget the error message for required fields
      required: [true, 'Review can not be empty!'],
      trim: true,
    },
    //2-Rating
    rating: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above or equal 1.0'],
      max: [5, 'Rating must be below or equal 5.0 '],
    },
    //3-CreatedAt
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    //4-Ref to the tour that this reveiw belongs to
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    //5-Ref to the user who wrote this review
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  //SCHEMA OPTIONS OBJECT
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//set compound index
//Limit the user to post one single review for each tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// QUERY MIDDLEWARES
//Automatically populate the tour & user fields in all querys using pre-find query middleware
reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

//Mongoose Static Mothod, we craeted a static function to be able to call aggregate in the model
//Calculate the ratings average and number of ratings for the tour where the review is just created
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        numRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  // console.log(stats);
  if (stats.length > 0) {
    //Save the stats to the current tour
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].numRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

//Post-save document middleware that will manipulate the ratings average after each review
reviewSchema.post('save', function () {
  //"this" keyword points to the currently saved review document
  this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate => findOneAndUpdate(ID)
// findByIdAndDelete => findOneAndDelete(ID)
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //"this" keyword is pointing to the current query, not the current document
  this.review = await this.findOne();
  // console.log(this.review);

  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  await this.review.constructor.calcAverageRatings(this.review.tour);
});

//Create the Model
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
