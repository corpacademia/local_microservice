const express = require('express');

const router = express.Router();
const {
    ec2Terraform,
    runTf,
    instanceToData,
    getInstanceOnParameters,
    getInstanceDetailsForPricing,
    vmToGoldenImage,
    goldenToInstance,
    goldenToInstanceForNewCatalogue,
    deleteVm,
    deleteSuperVm,
    handleLaunchSoftwareOrStop,
    getDecryptPasswordFromCloud,
    getNewIpFromCloud,
    getUserDecryptPasswordFromCloud,
    updateAssessmentStorage,
    createCloudAssignedInstance,
    startLab,
    stopLab,
    getCloudAssignedInstance,
    checkCloudAssignedInstanceLaunched,
    checkLabCloudInstanceLaunched,
    stopInstance,
    restartInstance,
    labProgress,
    createIamUser,
    editAwsServices,
    deleteAwsServices,
    addAwsServices,
    deleteIamAccount,
    deleteBatchLabService,
    disableIamLoginProfile,
    enableIamLoginProfile
} = require('../controllers/awsController');
// const { awsConfigure } = require('../../../lab-service/src/controllers/labController');

router.post('/python',ec2Terraform);
router.post('/pythontf',runTf);
router.post('/instancetodata',instanceToData);
router.post('/getInstances',getInstanceOnParameters);
router.post('/getInstanceDetails',getInstanceDetailsForPricing);
router.post('/createGoldenImage',vmToGoldenImage);
router.post('/goldenToInstance',goldenToInstance);
router.post('/createNewInstance',goldenToInstanceForNewCatalogue);
router.post('/deletevm',deleteVm);
router.post('/deleteBatchLabService',deleteBatchLabService)
router.post('/deletesupervm',deleteSuperVm);
router.post('/runSoftwareOrStop',handleLaunchSoftwareOrStop);
router.post('/decryptPassword', getDecryptPasswordFromCloud);
router.post('/getPublicIp', getNewIpFromCloud);
router.post('/userDecryptPassword', getUserDecryptPasswordFromCloud);
router.post('/updateAssessmentStorage', updateAssessmentStorage);
router.post('/launchInstance', createCloudAssignedInstance);
// router.post('/startLab', startLab);
// router.post('/stopLab', stopLab);
router.post('/getAssignedInstance', getCloudAssignedInstance);
router.post('/checkLabStatus', checkCloudAssignedInstanceLaunched);
router.post('/checkIsLabInstanceLaunched', checkLabCloudInstanceLaunched);
router.post('/stopInstance', stopInstance);
router.post('/restart_instance',restartInstance);
// router.post('/checkvmcreated',awsConfigure);
router.post('/labprogress',labProgress);
router.post('/createIamUser',createIamUser);
router.post('/editAwsServices',editAwsServices);
router.post('/deleteAwsServices',deleteAwsServices);
router.post('/addAwsServices',addAwsServices);
router.post('/deleteIamAccount',deleteIamAccount);
router.post('/disableIamLoginProfile', disableIamLoginProfile);
router.post('/enableIamLoginProfile', enableIamLoginProfile);

module.exports = router;




