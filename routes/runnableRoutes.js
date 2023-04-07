const express = require('express');
const runnableController = require('./../controllers/runnableController');

const router = express.Router();

router
  .route('/')
  .get(runnableController.getAllRunnables)
  .post(runnableController.createRunnable);

router
  .route('/:id')
  .get(runnableController.getRunnable)
  .patch(runnableController.updateRunnable)
  .delete(runnableController.deleteRunnable);

module.exports = router;
