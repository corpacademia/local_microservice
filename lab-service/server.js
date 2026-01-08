// server.js - Express + RDP proxy attach
require("dotenv").config();
const express = require("express");
const {app} = require('./src/app');
const bodyParser = require("body-parser");
const http = require("http");
const { createToken, debugDump } = require("./src/config/tokenStore");
const { setupRDPProxy } = require("./src/config/rdpProxy");

const PORT = parseInt(process.env.PORT || "3002", 10);
const TOKEN_TTL_MS = parseInt(process.env.TOKEN_TTL_MS || "60000", 10);

app.use(bodyParser.json());

// Endpoint to create a token for one-time use
app.post("/api/token", (req, res) => {
  try {
    const { hostname, port, username, password, protocol = "rdp" } = req.body;
    if (!hostname || !port) {
      return res.status(400).json({ success: false, message: "hostname and port required" });
    }

    const token = createToken(
      {
        protocol,
        hostname,
        port: Number(port),
        username,
        password,
      },
      TOKEN_TTL_MS
    );

    // Return a ws path; frontend builds full url using same origin / port
    const wsPath = `/rdp?token=${token}`;
    return res.json({ success: true, token, wsPath });
  } catch (err) {
    console.error("Error /api/token:", err);
    return res.status(500).json({ success: false, message: "internal error" });
  }
});

// debug endpoint (optional) to view current tokens - remove in prod
app.get("/api/debug/tokens", (req, res) => {
  return res.json({ store: debugDump() });
});

const server = http.createServer(app);

// Attach proxy WebSocket server that connects to guacd
setupRDPProxy(server);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`POST /api/token to issue one-time ws path (ttl ms = ${TOKEN_TTL_MS})`);
});
