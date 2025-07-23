const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../public/uploads/');
if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir,{recursive:true})
}

const storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,uploadDir)
    },
    filename:function(req,file,cb){
        cb(null,`${Date.now()}-${file.originalname}`)
    }
})

const upload = multer({storage});

const {
    getAllAwsServices,
    createCloudSliceLab,
    createCloudSliceLabWithModules,
    getCloudSliceLabByCreatedUserId,
    getCloudSliceLabById,
    updateServicesOnLabId,
    getModulesOnLabId,
    getLabExercisesOnModuleId,
    getAllModules,
  getLabExercises,
  getQuizExercises,
  updateModuleOnId,
  deleteModuleOnId,
  updateExerciseMainContentOnId,
  deleteExerciseOnId,
  updateLabExerciseOnExerciseId,
  updateQuizExerciseOnExerciseId,
  createModule,
  createExercise,
  createQuizExerciseContent,
  createLabExercise,
  deleteCloudSliceLab,
  updateCloudSliceLab,
  cloudSliceOrgAssignment,
  getCloudSliceLabAssignedToOrg,
  deleteCloudSliceLabAssignedToOrg,
  assignCloudSliceLabToUsers,
  getUserAssignedCloudSliceLabs,
  deleteUserAssignedCloudSliceLabs,
  updateQuizExerciseStatusOfUser,
  getUserQuizData,
  updateCloudSliceLabStatus,
  updateCloudSliceLabStatusOfOrg,
  getUserAssignedLabStatus,
  updateCloudSliceLabOfUser,
  getAllLabDetailsForOrgAssigned,
  updateUserCloudSliceLabTimes,
  getAllCloudSliceLabs,
  updateCloudSliceLabRunningStateOfUser,
  addLabStatusOfUser,
  getUserLabExerciseStatus,
  updateCatalogueDetails
} = require('../controllers/cloudSliceAwsController')

router.get('/getAwsServices',getAllAwsServices);
router.post('/createCloudSliceLab',createCloudSliceLab);
router.post('/createLabModules',upload.array('files'),createCloudSliceLabWithModules);
router.get('/getCloudSlices',getCloudSliceLabByCreatedUserId);
router.get('/getAllCloudSliceLabs',getAllCloudSliceLabs)
router.post('/getCloudSliceDetails/:labId',getCloudSliceLabById);
router.post('/updateCloudSliceServices/:labId',updateServicesOnLabId);

router.get('/getModules/:sliceId', getAllModules);
router.get('/lab-exercises/:moduleId', getLabExercises);
router.get('/quiz-exercises/:moduleId', getQuizExercises);
router.put('/updateModule', updateModuleOnId);
router.delete('/deleteModule/:moduleId', deleteModuleOnId) ;
router.put('/updateExercise',updateExerciseMainContentOnId);
router.delete('/deleteExercise/:exerciseId', deleteExerciseOnId);
router.put('/updateLabExercise',upload.array('files'),updateLabExerciseOnExerciseId);
router.put('/updateQuizExercise',updateQuizExerciseOnExerciseId);
router.post('/createModule',createModule);
router.post('/createExercise',createExercise);
router.post('/createQuizExercise',createQuizExerciseContent)
router.post('/createLabExercise',upload.array('files'),createLabExercise);
router.delete('/deleteCloudSlice/:labId',deleteCloudSliceLab);
router.put('/updateCloudSlice/:labId',updateCloudSliceLab);
router.post('/cloudSliceOrgAssignment',cloudSliceOrgAssignment);
router.get('/getOrgAssignedLabs/:orgId',getCloudSliceLabAssignedToOrg);
router.post('/orgAdminDeleteCloudSlice/:id',deleteCloudSliceLabAssignedToOrg);
router.post('/assignCloudSlice',assignCloudSliceLabToUsers);
router.get('/getUserCloudSlices/:userId',getUserAssignedCloudSliceLabs);
router.post('/deleteUserCloudSlice',deleteUserAssignedCloudSliceLabs);
router.post('/submit-quiz/:exerciseId',updateQuizExerciseStatusOfUser);
router.post('/getUserQuizData',getUserQuizData);
router.post('/getUserLabStatus',getUserLabExerciseStatus)
router.post('/updateLabStatus',updateCloudSliceLabStatus);
router.post('/updateLabStatusOfOrg',updateCloudSliceLabStatusOfOrg);
router.get('/getUserLabStatus/:userId',getUserAssignedLabStatus);
router.post('/updateLabStatusOfUser',updateCloudSliceLabOfUser);
router.get('/getOrgAssignedLabDetails/:orgId',getAllLabDetailsForOrgAssigned);
router.post('/updateUserCloudSliceTimes',updateUserCloudSliceLabTimes);
router.post('/updateCloudSliceRunningStateOfUser',updateCloudSliceLabRunningStateOfUser);
router.post('/addLabStatusOfUser',addLabStatusOfUser);
router.post('/updateCloudsliceCatalogueDetails',updateCatalogueDetails)

module.exports = router;