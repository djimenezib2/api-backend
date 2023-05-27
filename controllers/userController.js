const User = require('../models/userModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
// Do NOT update passwords with this
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

exports.getLastUsers = catchAsync(async (req, res, next) => {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);

  const counter = await User.countDocuments({
    createdAt: { $gte: twentyFourHoursAgo },
  });
  return res.status(200).json({
    success: true,
    counter: counter,
  });
});
