 const express = require('express');
 const multer = require('multer');
 const fs = require('fs');
 const path = require('path');


const {
    signupController,
    loginController,
    getAllUsers,
    addUser,
    getUserData,
    updateUserOrganization,
    updateUserRole,
    getTokenAndGetUserDetails,
    logoutController,
    updateUserController,
    getUsersFromOrganization,
    deleteUsers, 
    updateUser,
    insertUsers,
    addOrganizationUser,
    getOrganizationUser,
    deleteRandomUsers,
    updateUserProfile,
    sendVerificationEmail,
    verifyEmailCode
} = require('../controllers/authController');

//api router
const router = express.Router();
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
    cb(null, `${file.originalname}`); // Unique file names
  },
});
const upload = multer({ storage });
//Routes
router.post('/signup',signupController);
router.post('/login',loginController);
router.get("/allUsers",getAllUsers);
router.post('/addUser',addUser);
router.post('/getuserdata/:id',getUserData);
router.put('/updateUserOrganization',updateUserOrganization);
router.put('/updateUserRole',updateUserRole);
router.get('/user_profile', getTokenAndGetUserDetails, (req, res) => {
    res.json({ user: req.userData });
  });
router.post('/logout',logoutController);
router.put('/updateUser/:id',updateUserController);
router.get('/getUsersFromOrganization/:orgId',getUsersFromOrganization);
router.post('/deleteOrganizationUsers',deleteUsers);
router.put('/updateUserFromSuperadmin/:id',updateUser);
router.post('/insertUsers',insertUsers);
router.post('/addOrganizationUser',addOrganizationUser);
router.post('/getOrganizationUsers',getOrganizationUser);
router.post('/deleteUsers',deleteRandomUsers);
router.post('/update_profile',upload.array('profilePhoto'),updateUserProfile);

//get the profile photo
router.get('/uploads/:filename', (req, res) => {

  const filePath = path.join(uploadDir, req.params.filename);
  res.sendFile(filePath);
});
router.post('/send-verification-code',sendVerificationEmail);
router.post('/verify-code',verifyEmailCode)

 module.exports = router;