const express = require('express');
const router = express.Router();

const {
    addOrgCloudCredentials,
    getOrgCloudCredentials,
    editOrgCloudCredentials,
    addGlobalCloudCredentails,
    getGlobalCloudCredentials,
    deleteCredential
} = require('../services/cloudCredentials')

router.post('/add-cloud',addOrgCloudCredentials);
router.post('/global-cloud',addGlobalCloudCredentails);
router.get('/organization-clouds/:orgId',getOrgCloudCredentials);
router.get('/global-clouds',getGlobalCloudCredentials);
router.put('/editCredentials/:id',editOrgCloudCredentials);
router.delete('/delete-cloud/:id',deleteCredential)

module.exports = router;