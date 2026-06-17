const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');

// Public: get all batches
router.get('/', batchController.getAllBatches);
router.get('/:id', batchController.getBatch);

// Admin: create batch
router.post('/', batchController.createBatch);

// Videos inside batch
router.post('/:id/videos', batchController.addVideo);
router.put('/:id/videos/:videoId', batchController.updateVideo);
router.delete('/:id/videos/:videoId', batchController.deleteVideo);

// Delete batch
router.delete('/:id', batchController.deleteBatch);

module.exports = router;
