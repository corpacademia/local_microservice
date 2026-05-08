// const { Server } = require("socket.io");
// const redisAdapter = require("socket.io-redis");
// const redis = require("redis");

// const io = new Server({
//   cors: { origin: "*" }
// });

// // Redis 3 style client
// const pubClient = redis.createClient(6379, "localhost", { auth_pass: null });
// const subClient = redis.createClient(6379, "localhost", { auth_pass: null });

// // Error handlers
// pubClient.on("error", (err) => console.error("Redis pubClient error:", err));
// subClient.on("error", (err) => console.error("Redis subClient error:", err));

// // Attach adapter
// io.adapter(redisAdapter({ pubClient, subClient }));

// console.log("Socket.IO Redis adapter initialized (Redis v3)");

// module.exports = { io };


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
function sendNotification({ userId, notification }) {
  const message = JSON.stringify({ userId, notification });
  publisher.publish("notification", message);
}

function cataloguePurchaseUpdate({orgId,data}){
  const message = JSON.stringify({orgId,data});
  publisher.publish("cataloguePurchase",message)
}

function extensionRequestUpdate({orgId,data}){
  const message = JSON.stringify({orgId,data});
  publisher.publish("extensionRequest",message)
}

module.exports = { sendNotification, cataloguePurchaseUpdate,extensionRequestUpdate };
