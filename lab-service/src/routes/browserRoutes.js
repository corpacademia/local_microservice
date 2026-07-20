const express = require('express');
const { startBrowserSession, stopBrowserSession } = require('../controllers/browserController');

const router = express.Router();

router.post('/browser/startSession', startBrowserSession);
router.post('/browser/stopSession', stopBrowserSession);

module.exports = router;
