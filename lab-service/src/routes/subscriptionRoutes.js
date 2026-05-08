const express  = require('express');

const router = express.Router();
const { createPlan,
        getAllPlans,
        deletePlan,
        updatePlan,
        getLicenseKey,
        getAllLicenseKeys,
        updateLicenseKey,
        deleteKey,
        activateLicenseKey,
        generateAndMailKey,
        updateUsage
} = require('../services/subcriptionServices');

router.post('/createSubscriptionPlan',createPlan);
router.get('/getAllPlans',getAllPlans);
router.delete('/deletePlan/:deleteId',deletePlan);
router.post("/editPlan",updatePlan);
router.get('/getActiveLicenseKey/:orgId',getLicenseKey);
router.get("/getAllKeys",getAllLicenseKeys);
router.post("/updateLicenseKey",updateLicenseKey);
router.delete("/deleteKey/:deleteId",deleteKey);
router.post("/activateLicenseKey",activateLicenseKey);
router.post("/generateAndMailKey",generateAndMailKey);
router.post("/updateUsage",updateUsage)

module.exports = router;