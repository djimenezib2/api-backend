const errorModel = require('./../models/errorModel');
class AppError extends Error {
  constructor(message, statusCode, requestBody = '', source = '') {
    super(message); // when we use "extends" to call the parent class

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.requestBody = requestBody;
    this.source = source;

    Error.captureStackTrace(this, this.constructor);

    const errorBody = {
      message: this.message,
      statusCode: this.statusCode,
      status: this.status,
      isOperational: this.isOperational,
      requestBody: this.requestBody,
      source: this.source,
    };

    // Store
    errorModel.create(errorBody);
  }
}

module.exports = AppError;
