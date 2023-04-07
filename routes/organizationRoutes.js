const express = require('express');
const organizationController = require('./../controllers/organizationController');

const router = express.Router();

router
  .route('/')
  .get(organizationController.getAllOrganizations)
  .post(organizationController.sourcesOrganizaciones);

router.route('/publicContractingInstitutions').get(organizationController.getPublicContractingInstitutions);
router.route('/bidders').get(organizationController.getBidders);

router.route("/search").get(organizationController.search);

router
  .route('/:id')
  .get(organizationController.getOrganization)
  .patch(organizationController.updateOrganization)
  .delete(organizationController.deleteOrganization);

module.exports = router;
