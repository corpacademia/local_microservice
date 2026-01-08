const app = require('./src/app');
require('dotenv').config();
const { PORT } = process.env;

// Start server
const server = app.listen(PORT, (err) => {
  if (err) {
    console.error('Error starting cloudSlice server:', err);
  } else {
    console.log(`Cloudslice Service is running on port ${PORT}`);
  }
});

// Set long timeout for large file uploads (30 minutes)
server.setTimeout(1000 * 60 * 30); // 30 minutes

module.exports = app; // Export the app for testing purposes
