const express = require('express');
const router = express.Router();

const {
    addOrgCloudCredentials,
    getOrgCloudCredentials,
    editOrgCloudCredentials
} = require('../services/cloudCredentials')

router.post('/add-cloud',addOrgCloudCredentials);
router.get('/organization-clouds/:orgId',getOrgCloudCredentials);
router.put('/editCredentials/:id',editOrgCloudCredentials)


module.exports = router;