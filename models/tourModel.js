const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator');

//Create tours Mongoose Schema
const tourSchema = new mongoose.Schema(
  //SCHEMA DEFINITION OBJECT
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true, //not technically a validator, but we can consider it as a validator
      trim: true,
      maxlength: [40, 'A tour name must be less than or equal 40 characters'],
      minlength: [10, 'A tour name must be more than or equal 10 characters'],
      // validate: [validator.isAlpha, 'A tour name must only contain letters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      //enumIs used to identify only specific values the fields
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above or equal 1.0'],
      max: [5, 'Rating must be below or equal 5.0 '],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        //This only works on "CREATE" and "SAVE" method
        validator: function (val) {
          //this only points to currect doc on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) must be below the regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String, //The name of the image that will be read from the database/file system
      required: [true, 'A tour must have a cover image'],
    },
    images: [String], //This type means an array of strings
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  //SCHEMA OPTIONS OBJECT
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//Adding index to the price field (SINGLE-FIELD-INDEX)
// tourSchema.index({ price: 1 });

//Adding index to the slug field (SINGLE-FIELD-INDEX)
tourSchema.index({ slug: 1 });

//Adding index to the price field along with ratingsAverage field
//(COMPOUND INDEX)
tourSchema.index({ price: 1, ratingsAverage: -1 });

//Index f
tourSchema.index({ startLocation: '2dsphere' });

//Add a virtual Property
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//Add virtual populate to the reviews
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

//DOCUMENT MIDDLEWARE: runs before .save() and .create()
//PRE-SAVE DOCUMENT MIDDLEWARE (Pre-Save Hooks)
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//EMBEDDING GUIDES INTO TOURS
// tourSchema.pre('save', async function (next) {
//   //The result of map is an array of promises
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));

//   //Here we resolve all the promises in this array
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

//POST-SAVE DOCUMENT MIDDLEWARE (Post-Save Hook)
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

//Query Middleware: Excuted before find query is excuted
//PRE-FIND QUERY MIDDLEWARE (Pre-Find hook)
//This "RegEx" allows the middleware to run with any query that starts with find
tourSchema.pre(/^find/, function (next) {
  // tourSchema.pre('find', function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

//Automatically populate the guide field in all querys using pre-find query middleware
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// tourSchema.post(/^find/, function (docs, next) {
//   //Calculate how much time does the query took
//   console.log(`Query Took ${Date.now() - this.start} Milliseconds!`);
//   next();
// });

//AGGREGATION MIDDLEWARE
//Exclude the secret tour from the results of aggregation piplelines
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });

//Create out first Model Using the Schema
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
