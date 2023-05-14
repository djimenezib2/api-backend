const express = require('express');
const errorController = require('./../controllers/errorController');

const router = express.Router();

router.route('/').get(errorController.getAllErrors);
router.route('/:id').get(errorController.getError);

module.exports = router;
