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
     const { hostname, port, username, password, protocol = "rdp" } = req.body;
     if (!hostname || !port) {
       return res.status(400).json({ success: false, message: "hostname and port required" });
     }
 
    //  const token = createToken(
    //    {
    //      protocol,
    //      hostname,
    //      port: Number(port),
    //      username,
    //      password,
    //    },
    //    TOKEN_TTL_MS
    //  );
 
     // Return a ws path; frontend builds full url using same origin / port
     const connectionData = {
      protocol,
      hostname,
      port: Number(port),
      username
    };
   console.log("Username:",username);
    // 🪟 Windows (RDP)
    if (protocol === "rdp") {
      connectionData.password = password;
    }

    // Ubuntu (SSH with key)
    if (protocol === "ssh" && privateKey) {
      connectionData["private-key"] = privateKey.replace(/\\n/g, "\n");
    }
    console.log(privateKey)
    const token = createToken(connectionData, TOKEN_TTL_MS);
     
     const wsPath = `/${protocol}?token=${token}`;
     console.log(wsPath)
     return res.json({ success: true, token, wsPath });
   } catch (err) {
     console.error("Error /api/token:", err);
     return res.status(500).json({ success: false, message: "internal error" });
   }
};



module.exports = { connectGuacamole };
