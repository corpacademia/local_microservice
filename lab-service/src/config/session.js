// session.js
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const redis = require("redis");
require('dotenv').config();

// create old-style redis client
const redisClient = redis.createClient({
   host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379
});

const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  secret: "Corp#123",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: "lax",
  },
});

module.exports = { sessionMiddleware, redisClient };
