const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer')

const {
    organizations,
    deleteOrgAssignedCloudVms,
    organizationsParameter,
    createOrganization,
    getOrganizationStats,
    editOrganizationModal,
    deleteOrganization,
    updateOrganizationAdmin,
    approveOrRejectOrg,
    bringYourOwnCloud
} = require('../controllers/organizationController');


const uploadDir = path.join(__dirname, '../public/uploads/');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer storage options
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Use the correct folder path
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`); // Unique file names
  },
});

// Create the upload middleware using multer
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
});


//Routes
router.get('/organizations',organizations);
router.post('/deleteAssessment',deleteOrgAssignedCloudVms);
router.post('/getOrgDetails',organizationsParameter);
router.post('/createOrganization',upload.single('logo'),createOrganization)
router.get('/getOrgUsersCount/:orgId', getOrganizationStats);
router.post('/updateOrganization/:orgId',upload.single('logo'),editOrganizationModal);
router.post('/deleteOrganizations',deleteOrganization);
router.post('/updateOrgAdmin',updateOrganizationAdmin);
router.post('/approve',approveOrRejectOrg);
router.post('/updateBringYourOwnCloud',bringYourOwnCloud)


module.exports  = router;