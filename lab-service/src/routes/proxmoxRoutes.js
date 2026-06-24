const express = require('express');

const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require("os");

const {
    getStorages,
    getIsos,
    getNetworkBridges,
    getCpuModels,
    getClusterResources,
    uploadIsoFile,
    getNextVmid,
    createSingleVmProxmoxConfig,
    getSingleVmProxmoxLab,
    checkVMStatus,
    createVM,
    editProxmoxVm,
    deleteVmInProxmox,
    createTemplateInProxmox,
    getTemplateInformation,
    getProxmoxSingleVMLabOnUserId,
    assignLabToOrgAdmin,
    getOrgAssignedLabs,
    getSingleVMProxmoxLabs,
    deleteOrgAssignedLab,
    updateSingleVMProxmoxOrgTime,
    assignSingleVmToUser,
    getUserSingleVMProxmoxLab,
    deleteSingleVMProxmoxUser,
    createSingleVmProxmoxCatalogue,
    getUserSingleVMPurchasedLab,
    startVM,
    getTemplatesByNode,
    getIpOfVm,
    createUserVm,
    stopVM,
    deleteVMOFProxmox,
    getLabAdminsLab
} = require('../services/proxmoxService');


// Save ISO temporarily on disk
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, os.tmpdir()); // system temp dir
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname); // preserve original name
    },
  }),
});

router.post('/storages',getStorages);
router.post('/isos',getIsos);
router.post('/network-bridges',getNetworkBridges);
router.post('/cpu-models',getCpuModels);
router.get('/nodes/:id',getClusterResources);
router.post('/upload-iso',upload.array('iso'),uploadIsoFile);
router.post('/next-vm-id',getNextVmid);
router.post('/createSingleVmProxmoxLab',createSingleVmProxmoxConfig);
router.post('/getProxmoxLabsOnAdminId',getSingleVmProxmoxLab);
router.post('/checkVMStatus',checkVMStatus);
router.post('/launchVM',createVM);
router.post('/launchUserVm',createUserVm);
router.post('/updateProxmoxLab',editProxmoxVm);
router.post('/deleteProxmoxLab',deleteVmInProxmox);
router.post('/createTemplate',createTemplateInProxmox);
router.get('/getTemplateInformation/:labId',getTemplateInformation)
router.get('/getSingleVmProxmoxLabOnUserId/:userId',getProxmoxSingleVMLabOnUserId);
router.post('/assignLabToOrg',assignLabToOrgAdmin);
router.post('/getOrgAssignedLabs',getOrgAssignedLabs);
router.get('/getLabOnId/:labId',getSingleVMProxmoxLabs);
router.post('/deleteOrgAssignedLab',deleteOrgAssignedLab);
router.post('/updateSingleVMOrgLabTime',updateSingleVMProxmoxOrgTime);
router.post('/assignSingleVmProxmoxToUser',assignSingleVmToUser);
router.get('/getUserSingleVMProxmoxLab/:userId',getUserSingleVMProxmoxLab);
router.post('/deleteSingleVMProxmoxUser',deleteSingleVMProxmoxUser);
router.post('/createSingleVmProxmoxCatalogue',createSingleVmProxmoxCatalogue);
router.get('/getUserSingleVMPurchasedLab/:userId',getUserSingleVMPurchasedLab);
router.post('/startVM',startVM);
router.post('/stopVM',stopVM)
router.post('/templates',getTemplatesByNode)
router.post('/getIpOfVm',getIpOfVm);
router.post('/deleteVMOFProxmox',deleteVMOFProxmox);
router.post('/getProxmoxLabAdminsLab',getLabAdminsLab)

// ── Proxmox Cluster Lab routes ────────────────────────────────────────────────
const {
    createProxmoxClusterLab,
    getProxmoxClusterLabs,
    getProxmoxClusterLabOnId,
    getProxmoxClusterLabDetails,
    updateProxmoxClusterLab,
    deleteProxmoxClusterLab,
    assignProxmoxClusterToOrg,
    getOrgProxmoxClusterLabs,
    assignProxmoxClusterToUser,
    getUserProxmoxClusterLabs,
    launchProxmoxClusterVMs,
    stopProxmoxClusterVMs,
    getProxmoxClusterVMStatus,
    deleteProxmoxClusterUserAssignment,
    convertProxmoxClusterToCatalogue,
    updateProxmoxClusterCatalogueDetails,
    convertProxmoxClusterVMsToTemplates,
    launchProxmoxClusterConfigVMs,
    stopProxmoxClusterConfigVMs,
    getProxmoxClusterConfigVMStatus,
    startSingleProxmoxClusterVM,
    stopSingleProxmoxClusterVM,
    startSingleProxmoxClusterConfigVM,
    stopSingleProxmoxClusterConfigVM,
    startAndConnectProxmoxClusterVM,
    deleteProxmoxClusterFromOrganization,
    selfAssignProxmoxCluster,
    getProxmoxClusterLabAdminsLab,
    getOrgVMConfigs
} = require('../services/proxmoxClusterService');

router.post('/createProxmoxClusterLab',              createProxmoxClusterLab);
router.post('/getProxmoxClusterLabs',                getProxmoxClusterLabs);
router.post('/getProxmoxClusterLabOnId',             getProxmoxClusterLabOnId);
router.post('/getProxmoxClusterLabDetails',          getProxmoxClusterLabDetails);
router.post('/updateProxmoxClusterLab',              updateProxmoxClusterLab);
router.delete('/deleteProxmoxClusterLab/:labId',     deleteProxmoxClusterLab);
router.post('/assignProxmoxClusterToOrg',            assignProxmoxClusterToOrg);
router.post('/getOrgProxmoxClusterLabs',             getOrgProxmoxClusterLabs);
router.post('/assignProxmoxClusterToUser',           assignProxmoxClusterToUser);
router.post('/getUserProxmoxClusterLabs',            getUserProxmoxClusterLabs);
router.post('/launchProxmoxClusterVMs',              launchProxmoxClusterVMs);
router.post('/stopProxmoxClusterVMs',                stopProxmoxClusterVMs);
router.post('/getProxmoxClusterVMStatus',            getProxmoxClusterVMStatus);
router.post('/deleteProxmoxClusterUserAssignment',   deleteProxmoxClusterUserAssignment);
router.post('/convertProxmoxClusterToCatalogue',         convertProxmoxClusterToCatalogue);
router.post('/updateProxmoxClusterCatalogueDetails',     updateProxmoxClusterCatalogueDetails);
router.post('/convertProxmoxClusterVMsToTemplates',      convertProxmoxClusterVMsToTemplates);
router.post('/launchProxmoxClusterConfigVMs',            launchProxmoxClusterConfigVMs);
router.post('/stopProxmoxClusterConfigVMs',              stopProxmoxClusterConfigVMs);
router.post('/getProxmoxClusterConfigVMStatus',          getProxmoxClusterConfigVMStatus);
router.post('/startSingleProxmoxClusterVM',              startSingleProxmoxClusterVM);
router.post('/stopSingleProxmoxClusterVM',               stopSingleProxmoxClusterVM);
router.post('/startSingleProxmoxClusterConfigVM',        startSingleProxmoxClusterConfigVM);
router.post('/stopSingleProxmoxClusterConfigVM',         stopSingleProxmoxClusterConfigVM);
router.post('/startAndConnectProxmoxClusterVM',          startAndConnectProxmoxClusterVM);
router.post('/deleteProxmoxClusterFromOrganization',     deleteProxmoxClusterFromOrganization);
router.post('/selfAssignProxmoxCluster',                 selfAssignProxmoxCluster);
router.post('/getProxmoxClusterLabAdminsLab',getProxmoxClusterLabAdminsLab);
router.post('/getOrgVMConfigs',getOrgVMConfigs)
// ── End Proxmox Cluster Lab routes ────────────────────────────────────────────

module.exports = router;