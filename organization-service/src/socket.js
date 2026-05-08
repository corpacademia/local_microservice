const redis = require("redis");
require('dotenv').config();

// Publisher client
const publisher = redis.createClient(process.env.REDIS_PORT || 6379,  process.env.REDIS_HOST || "localhost");

publisher.on("error", (err) => console.error("Redis Pub Error:", err));

/**
 * Publish a notification
 * @param {Object} options
 * @param {string} options.userId - Target user ID
 * @param {Object} options.notification - Notification payload
 */

function bringYourOwnCloudUpdate({orgId,data}){
  const message = JSON.stringify({orgId,data});
  publisher.publish("bringYourOwnCloud",message);
}

module.exports = {  bringYourOwnCloudUpdate };
