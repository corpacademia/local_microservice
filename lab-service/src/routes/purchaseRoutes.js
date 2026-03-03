const express = require("express");
const router = express.Router();

const {
    getOrgCataloguePurchased,
    createTheExtensionRequest,
    extensionRequest,
    approveOrRejectExtensionRequest
} = require('../services/purchaseService');

router.post('/getAllCataloguePurchases',getOrgCataloguePurchased);
router.post('/requestCatalogueExtension',createTheExtensionRequest);
router.post('/getExtensionRequest',extensionRequest);
router.post('/approveCatalogueExtension',approveOrRejectExtensionRequest)

module.exports = router;