// guac-server.js (or wherever you defined connectGuacamole / attachGuacamoleServer)
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const GuacamoleLite = require("guacamole-lite");
require("dotenv").config();
const {createToken} = require('./tokenStore');

const { GUACD_HOST, GUACD_PORT, PORT, GUAC_KEY, GUAC_CYPHER,PEM_FILE_PATH } = process.env;
const TOKEN_TTL_MS = parseInt(process.env.TOKEN_TTL_MS || "60000", 10);
const fs = require("fs");

const privateKey = fs.readFileSync(PEM_FILE_PATH, "utf8");



// ---- CLIENT SIDE REQUEST ----
const connectGuacamole = (req, res) => {
 try {
    const hostname = req.body.hostname?.trim();
  const port = req.body.port;
  const username = req.body.username?.trim();
  const password = req.body.password?.trim();
  const protocol = req.body.protocol?.trim().toLowerCase() || "rdp";
     if (!hostname || !port) {
       return res.status(400).json({ success: false, message: "hostname and port required" });
     }
 
     // Return a ws path; frontend builds full url using same origin / port
     const connectionData = {
      protocol,
      hostname,
      port: Number(port),
      username
    };
    // 🪟 Windows (RDP)
    if (protocol === "rdp") {
      connectionData.password = password;
    }

    // Ubuntu (SSH with key)
    // if (protocol === "ssh" && privateKey) {
    //   connectionData["private-key"] = privateKey.replace(/\\n/g, "\n");
    // }
    if (protocol === "ssh") {
      if (password?.length > 0) {
        connectionData.password = password;
      } else if (privateKey) {
        connectionData["private-key"] = privateKey.replace(/\\n/g, "\n");
        console.log(privateKey)
      }
    }
   
    const token = createToken(connectionData, TOKEN_TTL_MS);
     
     const wsPath = `/${protocol}?token=${token}`;
     return res.json({ success: true, token, wsPath });
   } catch (err) {
     console.error("Error /api/token:", err);
     return res.status(500).json({ success: false, message: "internal error" });
   }
};



module.exports = { connectGuacamole };
