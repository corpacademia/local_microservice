// guac-server.js (or wherever you defined connectGuacamole / attachGuacamoleServer)
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const GuacamoleLite = require("guacamole-lite");
require("dotenv").config();
const {createToken} = require('./tokenStore');

const { GUACD_HOST, GUACD_PORT, PORT, GUAC_KEY, GUAC_CYPHER } = process.env;
const TOKEN_TTL_MS = parseInt(process.env.TOKEN_TTL_MS || "60000", 10);

// ---- CLIENT SIDE REQUEST ----
const connectGuacamole = (req, res) => {
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
};



module.exports = { connectGuacamole };
