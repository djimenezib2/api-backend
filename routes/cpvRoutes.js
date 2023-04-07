const express = require("express");
const cpvController = require("./../controllers/cpvController");

const router = express.Router();

// router
//   .route("/")
//   .get(cpvController.getAll)
//   .post(cpvController.create);

router.route("/search").get(cpvController.search);

// router
//   .route("/:id")
//   .get(cpvController.get)
//   .patch(cpvController.update)
//   .delete(cpvController.delete);

module.exports = router;
