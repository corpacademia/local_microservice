const redis = require("redis");

// Publisher client
const publisher = redis.createClient(6379, "localhost");

publisher.on("error", (err) => console.error("Redis Pub Error:", err));

/**
 * Publish a notification
 * @param {Object} options
 * @param {string} options.userId - Target user ID
 * @param {Object} options.notification - Notification payload
 */
function sendNotification({ userId, notification }) {
  const message = JSON.stringify({ userId, notification });
  publisher.publish("notification", message);
}

module.exports = { sendNotification };