const express = require('express');
const { startLabSession, stopLabSession, getDailyUsage } = require('../controllers/usageController');

const router = express.Router();

// Record session start and check daily limit before allowing access
router.post('/startLabSession', startLabSession);

// Record session end and accumulate minutes used today
router.post('/stopLabSession', stopLabSession);

// Get today's usage and remaining time for a user+lab pair
router.post('/getDailyUsage', getDailyUsage);

module.exports = router;
