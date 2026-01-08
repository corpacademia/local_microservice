const express = require('express');
const router = express.Router();


const {
    createBatch,
    getBatches,
    deleteBatch,
    getBatch,
    addUsersToBatch,
    getBatchUsers,
    getBatchLabs,
    updateBatchDetails,
    addLabsToBatch,
    getLabsForBatch,
    deleteUserAndItsLabs,
    deleteLabFromBatch,
    updateBatchLab
} = require('../services/batchesService');

//routes
router.post('/createBatch',createBatch);
router.get('/getBatches/:userId',getBatches);
router.delete('/deleteBatch/:batchId',deleteBatch);
router.get('/getBatch/:batchId',getBatch);
router.post('/addUsersToBatch',addUsersToBatch);
router.get('/getBatchUsers/:batchId',getBatchUsers);
router.get('/getBatchLabs/:batchId',getBatchLabs);
router.post('/updateBatch',updateBatchDetails);
router.post('/assignLabToBatch',addLabsToBatch);
router.post('/getLabs',getLabsForBatch);
router.post('/removeUserFromBatch',deleteUserAndItsLabs);
router.post('/removeLabFromBatch',deleteLabFromBatch);
router.post('/updateBatchLab',updateBatchLab)

module.exports = router;