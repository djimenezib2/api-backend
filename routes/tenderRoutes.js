const express = require('express');
const tenderController = require('./../controllers/tenderController');

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

// Other
router.route('/counter').get(tenderController.getCounter);
router.route('/lastTenders').get(tenderController.getLastTenders);

router.route('/').get(tenderController.getAll).post(tenderController.createOne);

// Licitaciones
router.route('/active').get(tenderController.getActive);

// Adjudicaciones
router.route('/adjudications').get(tenderController.getAdjudications);

// Contratos menores
router.route('/minorContracts').get(tenderController.getMinorContracts);

// Updates
router.route('/updateGeneral').patch(tenderController.updateGeneral);
router.route('/updateCPVs').patch(tenderController.updateCPVs);

router
  .route('/:id')
  .get(tenderController.getOne)
  .patch(tenderController.updateOne)
  .delete(tenderController.deleteOne);

module.exports = router;
