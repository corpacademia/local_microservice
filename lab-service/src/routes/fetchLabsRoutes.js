const express = require('express');

const router = express.Router();
const { 
    getOrgCloudsliceLabs,
    getOrgSingleVMDatacenterLabs,
    getOrgVMClusterDatacenterLabs,
    getOrgProxmoxLabs,
    getOrgAwsLabs
} = require('../services/fetchLabsService');

router.get('/getOrgCloudSliceUserInstances/:orgId/:labId',getOrgCloudsliceLabs);
router.get('/getOrgsingleVmDatacenterUserInstances/:orgId/:labId',getOrgSingleVMDatacenterLabs);
router.get('/getOrgVMClusterDatacenterLabs/:orgId/:labId',getOrgVMClusterDatacenterLabs);
router.get('/getOrgProxmoxUserInstances/:orgId/:labId',getOrgProxmoxLabs);
router.get('/getOrgSingleVmUserInstances/:orgId/:labId',getOrgAwsLabs)

module.exports = router;