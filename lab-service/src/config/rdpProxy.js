// rdpProxy.js
// Raw Guacamole protocol proxy: WebSocket <-> guacd (TCP)
// Performs select -> args -> size/audio/image -> connect -> ready -> proxy

const net = require("net");
const { WebSocketServer, WebSocket } = require("ws");
const { consumeToken } = require("./tokenStore");
require('dotenv').config()

const GUACD_HOST = process.env.GUACD_HOST || "127.0.0.1";
const GUACD_PORT = parseInt(process.env.GUACD_PORT || "4822", 10);

/**
 * Setup RDP proxy on provided HTTP server.
 * @param {import('http').Server} httpServer
 */
function setupRDPProxy(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/rdp",
  });

  console.log("[RDP Proxy] WebSocket server listening on path /rdp");

  wss.on("connection", (ws, request) => {
    console.log("[RDP Proxy] New WS connection");
    const requestUrl = (request.url || "").split("?undefined")[0];
    const url = new URL(requestUrl, `http://${request.headers.host}`);
    const token = url.searchParams.get("token");

    console.log("[RDP Proxy] token preview:", token ? token.slice(0, 8) + "..." : "null");
    if (!token) {
      ws.send("5.error,22.No token provided,12.UNAUTHORIZED;");
      ws.close();
      return;
    }

    const connectionInfo = consumeToken(token);
    if (!connectionInfo) {
      ws.send("5.error,25.Invalid or expired token,12.UNAUTHORIZED;");
      ws.close();
      return;
    }

    console.log(`[RDP Proxy] auth ok for ${connectionInfo.protocol} ${connectionInfo.hostname}:${connectionInfo.port}`);

    const guacdSocket = new net.Socket();
    let handshakeComplete = false;
    let buffer = "";

    guacdSocket.connect(GUACD_PORT, GUACD_HOST, () => {
      console.log(`[RDP Proxy] connected to guacd ${GUACD_HOST}:${GUACD_PORT}`);
      // Standard guacd select instruction format (opcode lengths included)
      // Use: "6.select,3.rdp;" (exact opcode formatting used by many examples)
      const proto = connectionInfo.protocol || "rdp";
      guacdSocket.write(`6.select,${proto.length}.${proto};`);
    });

    guacdSocket.on("data", (data) => {
      const text = data.toString("utf8");
      buffer += text;

      // If buffer contains complete instructions (terminated by ;)
      const lastSemicolon = buffer.lastIndexOf(";");
      if (lastSemicolon === -1) return;

      const complete = buffer.substring(0, lastSemicolon + 1);
      buffer = buffer.substring(lastSemicolon + 1);

      if (!handshakeComplete) {
        // split into instructions and handle each
        const instructions = complete.split(";").filter(Boolean);

        for (const inst of instructions) {
          // parse opcode from first part (e.g., "4.args,8.hostname,...")
          const parts = inst.split(",");
          const first = parts[0] || "";
          const dotIndex = first.indexOf(".");
          const opcode = dotIndex >= 0 ? first.substring(dotIndex + 1) : null;

          if (!opcode) continue;

          if (opcode === "args") {
            // collect requested argument names (parts like "8.hostname")
            const argNames = [];
            for (let i = 1; i < parts.length; i++) {
              const p = parts[i];
              const dot = p.indexOf(".");
              if (dot >= 0) {
                argNames.push(p.substring(dot + 1));
              }
            }
            console.log("[RDP Proxy] guacd requested args:", argNames);

            // Send capabilities (size, audio, image)
            // Format: "4.size,4.1024,3.768,2.96;" -> size,1024,768,96
            guacdSocket.write(`4.size,4.1024,3.768,2.96;`);
            guacdSocket.write(`5.audio,9.audio/L16;`);
            guacdSocket.write(`5.image,9.image/png,10.image/jpeg;`);

            // Build connect instruction in requested order
            const connectInst = buildConnectInstruction(connectionInfo, argNames);
            console.log("[RDP Proxy] sending connect (truncated):", connectInst.substring(0, 120));
            guacdSocket.write(connectInst);
          } else if (opcode === "ready") {
            // Handshake finished — forward ready to browser
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(inst + ";");
            }
            handshakeComplete = true;
            console.log("[RDP Proxy] handshake complete, proxying now");
          } else if (opcode === "error") {
            console.error("[RDP Proxy] guacd handshake error:", inst);
            if (ws.readyState === WebSocket.OPEN) ws.send(inst + ";");
            ws.close();
            guacdSocket.destroy();
            return;
          } else {
            // Other opcodes during handshake - optionally log
          }
        }
      } else {
        // After handshake, forward chunks to browser
        if (ws.readyState === WebSocket.OPEN) ws.send(complete);
      }
    });

    // Browser -> guacd
    ws.on("message", (msg) => {
      try {
        if (handshakeComplete && !guacdSocket.destroyed) {
          const payload = typeof msg === "string" ? msg : msg.toString();
          guacdSocket.write(payload);
        } else {
          // not ready yet — ignore or optionally buffer
        }
      } catch (err) {
        console.error("[RDP Proxy] Error writing to guacd:", err);
      }
    });

    ws.on("close", () => {
      if (!guacdSocket.destroyed) guacdSocket.destroy();
    });

    ws.on("error", (err) => {
      console.error("[RDP Proxy] WS error:", err);
      if (!guacdSocket.destroyed) guacdSocket.destroy();
    });

    guacdSocket.on("error", (err) => {
      console.error("[RDP Proxy] guacd socket error:", err);
      if (ws.readyState === WebSocket.OPEN) {
        const msg = `5.error,${String(err.message).length}.${err.message},5.ERROR;`;
        ws.send(msg);
      }
      ws.close();
    });

    guacdSocket.on("close", () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    });
  });

  return wss;
}

function buildConnectInstruction(connectionInfo, argNames) {
  // map arg name -> value
  const map = {
    hostname: connectionInfo.hostname,
    port: String(connectionInfo.port),
    username: connectionInfo.username || "",
    password: connectionInfo.password || "",
    width: "1024",
    height: "768",
    dpi: "96",
    security: "any",
    "ignore-cert": "true",
    "server-layout": "",
    timezone: "",
    console: "true",
    "disable-audio": "",
    "enable-audio-input": "",
    "enable-printing": "",
    "enable-drive": "",
    "drive-path": "",
    "create-drive-path": "",
    "static-channels": "",
  };

  const parts = argNames.map((name) => {
    const val = (map[name] !== undefined && map[name] !== null) ? String(map[name]) : "";
    return `${val.length}.${val}`;
  });

  return `7.connect,${parts.join(",")};`;
}

module.exports = { setupRDPProxy };
