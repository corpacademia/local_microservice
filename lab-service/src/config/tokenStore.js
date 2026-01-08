// simple in-memory token store (one-time tokens)
const { v4: uuidv4 } = require("uuid");

const rdpTokenStore = new Map();

/**
 * Create a one-time token entry.
 * @param {Object} entry - { protocol, hostname, port, username, password }
 * @param {number} ttlMs - time-to-live in ms
 * @returns {string} token
 */
function createToken(entry, ttlMs) {
  const token = uuidv4();
  const expires = Date.now() + ttlMs;
  const connectionId = Math.floor(Math.random() * 1e9);
  rdpTokenStore.set(token, {
    connectionId,
    ...entry,
    expires,
  });
  return token;
}

/**
 * Consume a token (one-time). Returns entry or null.
 * @param {string} token
 */
function consumeToken(token) {
  const e = rdpTokenStore.get(token);
  if (!e) return null;
  if (e.expires < Date.now()) {
    rdpTokenStore.delete(token);
    return null;
  }
  // one-time use
  rdpTokenStore.delete(token);
  return e;
}

function debugDump() {
  const out = {};
  for (const [k, v] of rdpTokenStore.entries()) out[k] = v;
  return out;
}

module.exports = { createToken, consumeToken, debugDump };
