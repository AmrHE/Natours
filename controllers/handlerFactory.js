const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

//Delete Document Factory Function
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with this ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

//Update Document Factory Function
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const updatedDoc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedDoc) {
      return next(new AppError('No document found with this ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: updatedDoc,
      },
    });
  });

//Create Document Factory Function
exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc,
      },
    });
  });

//Get All Documents Factory Function
exports.getAll = (Model) =>
  catchAsync(async (req, res) => {
    //To allow nested GET reviews on tour using tourID param
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    //Create the query
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    //EXCUTE THE QUERY
    // const docs = await features.query.explain();
    const docs = await features.query;

    //3. SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        data: docs,
      },
    });
  });

//GET Document Factory Function
exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);

    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with this ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
