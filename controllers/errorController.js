const Error = require('./../models/errorModel');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');

exports.getError = factory.getOne(Error);
exports.getAllErrors = factory.getAll(Error);
