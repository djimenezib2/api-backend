const Runnable = require('./../models/runnableModel');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

exports.createRunnable = async (req, res, next) => {
  // Check API KEY
  const receivedApiKey = req.headers;
  if (req.headers['api-key'] !== process.env.SCRAPPER_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  // Try to create Runnable if not exists
  try {
    doc = await Runnable.create({
      start: req.body.start,
      end: req.body.end,
      duration: req.body.duration,
      items: req.body.items,
      source: req.body.source,
      type: req.body.type,
    });
  } catch (error) {
    new AppError(
      error.message,
      404,
      JSON.stringify(req.body),
      'Contratacion del Estado'
    );
    return res.status(404).json({ success: false, message: error.message });
  }

  // Return status
  return res.status(200).json({
    success: true,
    message: 'Runnable created successfully',
    data: {
      doc,
    },
  });
};

exports.getRunnable = factory.getOne(Runnable);
exports.getAllRunnables = factory.getAll(Runnable);
exports.updateRunnable = factory.updateOne(Runnable);
exports.deleteRunnable = factory.deleteOne(Runnable);
