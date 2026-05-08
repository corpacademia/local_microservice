// rdpProxy.js
// Raw Guacamole protocol proxy: WebSocket <-> guacd (TCP)
// Performs select -> args -> size/audio/image -> connect -> ready -> proxy

const net = require("net");
const { WebSocketServer, WebSocket } = require("ws");
const { consumeToken } = require("./tokenStore");
const fs = require('fs');
require('dotenv').config()

const GUACD_HOST = process.env.GUACD_HOST || "127.0.0.1";
const GUACD_PORT = parseInt(process.env.GUACD_PORT || "4822", 10);
const PEM_FILE_PATH = process.env.PEM_FILE_PATH;

const privateKey = fs.readFileSync(PEM_FILE_PATH, 'utf8');

/**
 * Setup RDP proxy on provided HTTP server.
 * @param {import('http').Server} httpServer
 */
// function setupRDPProxy(httpServer) {
//   const wss = new WebSocketServer({
//     server: httpServer,
//     path: "/rdp",
//   });

//   console.log("[RDP Proxy] WebSocket server listening on path /rdp");

//   wss.on("connection", (ws, request) => {
//     console.log("[RDP Proxy] New WS connection");
//     const requestUrl = (request.url || "").split("?undefined")[0];
//     const url = new URL(requestUrl, `http://${request.headers.host}`);
//     const token = url.searchParams.get("token");

//     console.log("[RDP Proxy] token preview:", token ? token.slice(0, 8) + "..." : "null");
//     if (!token) {
//       ws.send("5.error,22.No token provided,12.UNAUTHORIZED;");
//       ws.close();
//       return;
//     }

//     const connectionInfo = consumeToken(token);
//     if (!connectionInfo) {
//       ws.send("5.error,25.Invalid or expired token,12.UNAUTHORIZED;");
//       ws.close();
//       return;
//     }

//     console.log(`[RDP Proxy] auth ok for ${connectionInfo.protocol} ${connectionInfo.hostname}:${connectionInfo.port}`);

//     const guacdSocket = new net.Socket();
//     let handshakeComplete = false;
//     let buffer = "";

//     guacdSocket.connect(GUACD_PORT, GUACD_HOST, () => {
//       console.log(`[RDP Proxy] connected to guacd ${GUACD_HOST}:${GUACD_PORT}`);
//       // Standard guacd select instruction format (opcode lengths included)
//       // Use: "6.select,3.rdp;" (exact opcode formatting used by many examples)
//       const proto = connectionInfo.protocol || "rdp";
//       guacdSocket.write(`6.select,${proto.length}.${proto};`);
//     });

//     guacdSocket.on("data", (data) => {
//       const text = data.toString("utf8");
//       buffer += text;

//       // If buffer contains complete instructions (terminated by ;)
//       const lastSemicolon = buffer.lastIndexOf(";");
//       if (lastSemicolon === -1) return;

//       const complete = buffer.substring(0, lastSemicolon + 1);
//       buffer = buffer.substring(lastSemicolon + 1);

//       if (!handshakeComplete) {
//         // split into instructions and handle each
//         const instructions = complete.split(";").filter(Boolean);

//         for (const inst of instructions) {
//           // parse opcode from first part (e.g., "4.args,8.hostname,...")
//           const parts = inst.split(",");
//           const first = parts[0] || "";
//           const dotIndex = first.indexOf(".");
//           const opcode = dotIndex >= 0 ? first.substring(dotIndex + 1) : null;

//           if (!opcode) continue;

//           if (opcode === "args") {
//             // collect requested argument names (parts like "8.hostname")
//             const argNames = [];
//             for (let i = 1; i < parts.length; i++) {
//               const p = parts[i];
//               const dot = p.indexOf(".");
//               if (dot >= 0) {
//                 argNames.push(p.substring(dot + 1));
//               }
//             }
//             console.log("[RDP Proxy] guacd requested args:", argNames);

//             // Send capabilities (size, audio, image)
//             // Format: "4.size,4.1024,3.768,2.96;" -> size,1024,768,96
//             guacdSocket.write(`4.size,4.1024,3.768,2.96;`);
//             guacdSocket.write(`5.audio,9.audio/L16;`);
//             guacdSocket.write(`5.image,9.image/png,10.image/jpeg;`);

//             // Build connect instruction in requested order
//             const connectInst = buildConnectInstruction(connectionInfo, argNames);
//             console.log("[RDP Proxy] sending connect (truncated):", connectInst.substring(0, 120));
//             guacdSocket.write(connectInst);
//           } else if (opcode === "ready") {
//             // Handshake finished — forward ready to browser
//             if (ws.readyState === WebSocket.OPEN) {
//               ws.send(inst + ";");
//             }
//             handshakeComplete = true;
//             console.log("[RDP Proxy] handshake complete, proxying now");
//           } else if (opcode === "error") {
//             console.error("[RDP Proxy] guacd handshake error:", inst);
//             if (ws.readyState === WebSocket.OPEN) ws.send(inst + ";");
//             ws.close();
//             guacdSocket.destroy();
//             return;
//           } else {
//             // Other opcodes during handshake - optionally log
//           }
//         }
//       } else {
//         // After handshake, forward chunks to browser
//         if (ws.readyState === WebSocket.OPEN) ws.send(complete);
//       }
//     });

//     // Browser -> guacd
//     ws.on("message", (msg) => {
//       try {
//         if (handshakeComplete && !guacdSocket.destroyed) {
//           const payload = typeof msg === "string" ? msg : msg.toString();
//           guacdSocket.write(payload);
//         } else {
//           // not ready yet — ignore or optionally buffer
//         }
//       } catch (err) {
//         console.error("[RDP Proxy] Error writing to guacd:", err);
//       }
//     });

//     ws.on("close", () => {
//       if (!guacdSocket.destroyed) guacdSocket.destroy();
//     });

//     ws.on("error", (err) => {
//       console.error("[RDP Proxy] WS error:", err);
//       if (!guacdSocket.destroyed) guacdSocket.destroy();
//     });

//     guacdSocket.on("error", (err) => {
//       console.error("[RDP Proxy] guacd socket error:", err);
//       if (ws.readyState === WebSocket.OPEN) {
//         const msg = `5.error,${String(err.message).length}.${err.message},5.ERROR;`;
//         ws.send(msg);
//       }
//       ws.close();
//     });

//     guacdSocket.on("close", () => {
//       if (ws.readyState === WebSocket.OPEN) ws.close();
//     });
//   });

//   return wss;
// }
// function setupSSHProxy(httpServer) {
//   const wss = new WebSocketServer({
//     server: httpServer,
//     path: "/ssh",
//   });

//   console.log("[SSH Proxy] WebSocket server listening on path /ssh");

//   wss.on("connection", (ws, request) => {
//     console.log("[SSH Proxy] New WS connection");

//     const url = new URL(request.url, `http://${request.headers.host}`);
//     const token = url.searchParams.get("token");

//     console.log("[SSH Proxy] token:", token);

//     if (!token) {
//       ws.send("5.error,22.No token provided,12.UNAUTHORIZED;");
//       ws.close();
//       return;
//     }

//     const connectionInfo = consumeToken(token);
//     if (!connectionInfo) {
//       ws.send("5.error,25.Invalid or expired token,12.UNAUTHORIZED;");
//       ws.close();
//       return;
//     }

//     console.log(
//       `[SSH Proxy] auth ok for ${connectionInfo.hostname}:${connectionInfo.port}`
//     );

//     const guacdSocket = new net.Socket();
//     let handshakeComplete = false;
//     let buffer = "";

//     // 🔌 Connect to guacd
//     guacdSocket.connect(GUACD_PORT, GUACD_HOST, () => {
//       console.log(
//         `[SSH Proxy] connected to guacd ${GUACD_HOST}:${GUACD_PORT}`
//       );

//       const proto = "ssh";
//       guacdSocket.write(`6.select,${proto.length}.${proto};`);
//     });

//     // 📥 Handle guacd data
//     guacdSocket.on("data", (data) => {
//       const text = data.toString("utf8");
//       buffer += text;

//       const lastSemicolon = buffer.lastIndexOf(";");
//       if (lastSemicolon === -1) return;

//       const complete = buffer.substring(0, lastSemicolon + 1);
//       buffer = buffer.substring(lastSemicolon + 1);

//       if (!handshakeComplete) {
//         const instructions = complete.split(";").filter(Boolean);

//         for (const inst of instructions) {
//           const parts = inst.split(",");
//           const first = parts[0] || "";
//           const dotIndex = first.indexOf(".");
//           const opcode =
//             dotIndex >= 0 ? first.substring(dotIndex + 1) : null;

//           if (!opcode) continue;

//           if (opcode === "args") {
//             const argNames = [];

//             for (let i = 1; i < parts.length; i++) {
//               const p = parts[i];
//               const dot = p.indexOf(".");
//               if (dot >= 0) {
//                 argNames.push(p.substring(dot + 1));
//               }
//             }

//             console.log("[SSH Proxy] guacd requested args:", argNames);

//             // capabilities
//             guacdSocket.write(`4.size,4.1024,3.768,2.96;`);
//             guacdSocket.write(`5.audio,9.audio/L16;`);
//             guacdSocket.write(`5.image,9.image/png,10.image/jpeg;`);

//             const connectInst = buildSSHConnectInstruction(
//               connectionInfo,
//               argNames
//             );

//             console.log(
//               "[SSH Proxy] sending connect:",
//               connectInst.substring(0, 120)
//             );

//             guacdSocket.write(connectInst);
//           } else if (opcode === "ready") {
//             if (ws.readyState === 1) {
//               ws.send(inst + ";");
//             }
//             handshakeComplete = true;
//             console.log("[SSH Proxy] handshake complete");
//           } else if (opcode === "error") {
//             console.error("[SSH Proxy] guacd error:", inst);
//             if (ws.readyState === 1) ws.send(inst + ";");
//             ws.close();
//             guacdSocket.destroy();
//             return;
//           }
//         }
//       } else {
//         if (ws.readyState === 1) ws.send(complete);
//       }
//     });

//     // 🔁 Browser → guacd
//     ws.on("message", (msg) => {
//       if (handshakeComplete && !guacdSocket.destroyed) {
//         const payload =
//           typeof msg === "string" ? msg : msg.toString();
//         guacdSocket.write(payload);
//       }
//     });

//     ws.on("close", () => {
//       if (!guacdSocket.destroyed) guacdSocket.destroy();
//     });

//     ws.on("error", (err) => {
//       console.error("[SSH Proxy] WS error:", err);
//       if (!guacdSocket.destroyed) guacdSocket.destroy();
//     });

//     guacdSocket.on("error", (err) => {
//       console.error("[SSH Proxy] guacd error:", err);
//       ws.close();
//     });

//     guacdSocket.on("close", () => {
//       if (ws.readyState === 1) ws.close();
//     });
//   });

//   return wss;
// }

function setupGuacProxy(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  console.log("[Guac Proxy] WebSocket server initialized");

  wss.on("connection", (ws, request) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = url.pathname;
    const token = url.searchParams.get("token");

    console.log("[Guac Proxy] Path:", pathname);
    console.log("[Guac Proxy] Token:", token);

    if (!token) {
      ws.close();
      return;
    }

    const connectionInfo = consumeToken(token);
    if (!connectionInfo) {
      ws.close();
      return;
    }

    const protocol = connectionInfo.protocol || "rdp";

    console.log(`[Guac Proxy] ${protocol} -> ${connectionInfo.hostname}:${connectionInfo.port}`);

    const guacdSocket = new net.Socket();
    let handshakeComplete = false;
    let buffer = "";

    guacdSocket.connect(GUACD_PORT, GUACD_HOST, () => {
      console.log(`[Guac Proxy] connected to guacd`);

      guacdSocket.write(`6.select,${protocol.length}.${protocol};`);
    });

    guacdSocket.on("data", (data) => {
      const text = data.toString("utf8");
      buffer += text;

      const lastSemicolon = buffer.lastIndexOf(";");
      if (lastSemicolon === -1) return;

      const complete = buffer.substring(0, lastSemicolon + 1);
      buffer = buffer.substring(lastSemicolon + 1);

      if (!handshakeComplete) {
        const instructions = complete.split(";").filter(Boolean);

        for (const inst of instructions) {
          const parts = inst.split(",");
          const first = parts[0];
          const opcode = first?.split(".")[1];

          if (opcode === "args") {
            const argNames = parts.slice(1).map(p => p.split(".")[1]);

            // capabilities
            guacdSocket.write(`4.size,4.1024,3.768,2.96;`);
            guacdSocket.write(`5.audio,9.audio/L16;`);
            guacdSocket.write(`5.image,9.image/png,10.image/jpeg;`);

            const connectInst = buildConnectInstruction(connectionInfo, argNames);
            guacdSocket.write(connectInst);
          }

          if (opcode === "ready") {
            ws.send(inst + ";");
            handshakeComplete = true;
          }

          if (opcode === "error") {
            ws.send(inst + ";");
            ws.close();
            guacdSocket.destroy();
            return;
          }
        }
      } else {
        ws.send(complete);
      }
    });

    ws.on("message", (msg) => {
      if (handshakeComplete && !guacdSocket.destroyed) {
        guacdSocket.write(msg.toString());
      }
    });

    ws.on("close", () => guacdSocket.destroy());
    ws.on("error", () => guacdSocket.destroy());

    guacdSocket.on("close", () => ws.close());
    guacdSocket.on("error", () => ws.close());
  });

  return wss;
}

// function buildConnectInstruction(connectionInfo, argNames) {
//   // map arg name -> value
//   const map = {
//     hostname: connectionInfo.hostname,
//     port: String(connectionInfo.port),
//     username: connectionInfo.username || "",
//     password: connectionInfo.password || "",
//     width: "1024",
//     height: "768",
//     dpi: "96",
//     security: "any",
//     "ignore-cert": "true",
//     "server-layout": "",
//     timezone: "",
//     console: "true",
//     "disable-audio": "",
//     "enable-audio-input": "",
//     "enable-printing": "",
//     "enable-drive": "",
//     "drive-path": "",
//     "create-drive-path": "",
//     "static-channels": "",
//   };

//   const parts = argNames.map((name) => {
//     const val = (map[name] !== undefined && map[name] !== null) ? String(map[name]) : "";
//     return `${val.length}.${val}`;
//   });

//   return `7.connect,${parts.join(",")};`;
// }

function buildConnectInstruction(connectionInfo, argNames) {
  const protocol = (connectionInfo.protocol || "rdp").toLowerCase();
  
  // Base arguments (common for all protocols)
  const baseMap = {
    hostname: connectionInfo.hostname,
    port: String(connectionInfo.port),
    username: connectionInfo.username || "",
  };

  // If SSH and private key is provided → use key auth
  // const isSSHKeyAuth =
  //   protocol === "ssh" && privateKey;

  // // Authentication handling
  // const authMap = isSSHKeyAuth
  //   ? {
  //       password: "", // MUST be empty when using private key
  //       "private-key": privateKey,
  //       passphrase: connectionInfo.passphrase || "",
  //     }
  //   : {
  //       password: connectionInfo.password || "",
  //     };
  const usePasswordAuth =
  (protocol === "rdp" && !!connectionInfo.password) ||  (protocol === "ssh" && !!connectionInfo.password);

const useKeyAuth =
  protocol === "ssh" && !connectionInfo.password && !!privateKey;

const authMap = usePasswordAuth
  ? {
      password: connectionInfo.password
    }
  : useKeyAuth
  ? {
      password: "",
      "private-key": privateKey,
      passphrase: connectionInfo.passphrase || ""
    }
  : {};

  console.log("AuthMap:",authMap);
  console.log("username:",connectionInfo.username)
  // RDP defaults
  const rdpDefaults = {
    width: "1024",
    height: "768",
    dpi: "96",
    security: "nla",
    "ignore-cert": "true",
    console: "true",
  };

  // SSH defaults
  const sshDefaults = {
    "color-scheme": "green-black",
    "font-size": "12",
    scrollback: "1000",
    "server-alive-interval": "30",
     "resize-method": "display",
      cols: "120",  
       rows: "40",
  };

  // VNC defaults
  const vncDefaults = {
    width: "1024",
    height: "768",
    dpi: "96",
    cursor: "local",
  };

  let protocolDefaults = {};

  if (protocol === "rdp") protocolDefaults = rdpDefaults;
  if (protocol === "ssh") protocolDefaults = sshDefaults;
  if (protocol === "vnc") protocolDefaults = vncDefaults;

  // Merge everything
  const finalMap = {
    ...baseMap,
    ...authMap,
    ...protocolDefaults,
    ...(connectionInfo.extraArgs || {}),
  };

  // Build instruction in requested order
  const parts = argNames.map((name) => {
    const val =
      finalMap[name] !== undefined && finalMap[name] !== null
        ? String(finalMap[name])
        : "";
    return `${val.length}.${val}`;
  });

  return `7.connect,${parts.join(",")};`;
}


module.exports = { setupGuacProxy };
