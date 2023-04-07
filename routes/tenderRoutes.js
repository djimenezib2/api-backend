const express = require('express');
const tenderController = require('./../controllers/tenderController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Sources
router.route('/filtered').get(tenderController.getFilteredTenders);

// - Contrataciones del estado
router
  .route('/source/contratacionesDelEstado')
  .get(tenderController.getTendersContratacionesDelEstado);
router
  .route('/source/contratacionesdelestado/create')
  .post(tenderController.sourcesSpainContratacionesDelEstado);

// - Consultas preliminares
router
  .route('/source/consultas/create')
  .post(tenderController.sourcesSpainConsultasPreliminares);

// - Contratos menores
router
  .route('/source/contratacionesMenores')
  .get(tenderController.getTendersContratacionesMenores);
router
  .route('/source/contratacionesmenores/create')
  .post(tenderController.createFromContratacionesMenores);

// - BOE
router.route('/source/boe').get(tenderController.getTendersBoe);
router.route('/source/boe/create').post(tenderController.createFromBoe);

// - Portugal
router.route('/source/dre').get(tenderController.getTendersDre);
router.route('/source/dre/create').post(tenderController.createFromDre);

// - Europa
router.route('/source/ted').get(tenderController.getTendersTed);
router.route('/source/ted/create').post(tenderController.createFromTed);

// - Gencat
router.route('/source/gencat').get(tenderController.getTendersGencat);
router.route('/source/gencat/create').post(tenderController.createFromGencat);
// ...

router.use(authController.protect);
// Other
router.route('/counter').get(tenderController.getCounter);

router
  .route('/')
  .get(tenderController.getAll)
  .post(
    authController.restrictTo('admin', 'super-admin'),
    tenderController.createOne,
  );

// Licitaciones
router.route('/active').get(tenderController.getActive);
router.route('/related').get(tenderController.getRelated);

// Adjudicaciones
router.route('/adjudications').get(tenderController.getAdjudications);
//router.route("/cpvFilter").get(tenderController.getTendersByCpvs);

// Contratos menores
router.route('/minorContracts').get(tenderController.getMinorContracts);

// Updates
router.route('/updateGeneral').patch(tenderController.updateGeneral);
router.route('/updateCPVs').patch(tenderController.updateCPVs);

router
  .route('/:id')
  .get(tenderController.getOne)
  .patch(
    authController.restrictTo('admin', 'super-admin'),
    tenderController.updateOne,
  )
  .delete(
    authController.restrictTo('admin', 'super-admin'),
    tenderController.deleteOne,
  );

// router.route("/").get(tenderController.getAllTenders);
// .post(tenderController.createTender);

// router.route("/:key").get(tenderController.getTender);
// .patch(tenderController.updateTender)
// .delete(tenderController.deleteTender);

module.exports = router;
