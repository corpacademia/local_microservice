const crypto = require('crypto');
const { createSession, destroySession } = require('../services/browserService');

// POST /browser/startSession
// Launches a Puppeteer Chromium instance, logs into the AWS Console,
// and returns a sessionId the frontend uses to connect the WebSocket stream.
const startBrowserSession = async (req, res) => {
  try {
    const { consoleUrl, username, password } = req.body;

    if (!consoleUrl || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'consoleUrl, username, and password are required',
      });
    }

    const sessionId = crypto.randomUUID();

    // Awaiting here means the response is sent only after login completes (~10-20s).
    // The frontend shows a loading state during this time.
    await createSession(sessionId, consoleUrl, username, password);

    return res.status(200).json({ success: true, sessionId });
  } catch (err) {
    console.error('[browser-controller] startBrowserSession error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /browser/stopSession
// Kills the Chromium instance for the given sessionId.
const stopBrowserSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required' });
    }
    await destroySession(sessionId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[browser-controller] stopBrowserSession error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { startBrowserSession, stopBrowserSession };
