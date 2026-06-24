const express = require("express");
const router = express.Router();

const {
    getOrgCataloguePurchased,
    createTheExtensionRequest,
    extensionRequest,
    approveOrRejectExtensionRequest,
    checkLabAvailability,
    getUserPurchasedSingleVmDatacenterLabs,
    checkQuantityOfPurchased
} = require('../services/purchaseService');

router.post('/getAllCataloguePurchases',getOrgCataloguePurchased);
router.post('/requestCatalogueExtension',createTheExtensionRequest);
router.post('/getExtensionRequest',extensionRequest);
router.post('/approveCatalogueExtension',approveOrRejectExtensionRequest);
router.post('/checkLabAvailability',checkLabAvailability);
router.post('/getUserPurchasedSingleVmDatacenterLabs',getUserPurchasedSingleVmDatacenterLabs);
router.post('/checkQuantity',checkQuantityOfPurchased)

module.exports = router;