import { Server } from "socket.io";
import redis from "redis";
import dotenv from "dotenv";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS ||  "http://localhost:5173", // frontend URL
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Create Redis clients
  const subscriber = redis.createClient(process.env.REDIS_PORT || 6379,  process.env.REDIS_HOST || "localhost");

  subscriber.on("error", (err) => {
    console.error("Redis Sub Error:", err);
  });

  //  Subscribe to notification channel
  subscriber.subscribe("notification");
   subscriber.subscribe("cataloguePurchase");

  subscriber.on("message", (channel, message) => {
    if (channel === "notification") {
      try {
        const { userId, notification } = JSON.parse(message);
        console.log("📥 Received notification from Redis:");

        // Forward to socket.io room
        io.to(`user_${userId}`).emit("notification", notification);
        console.log(` Emitted notification to user_${userId}:`);
      } catch (err) {
        console.error("Failed to parse notification:", err);
      }
    }
    else if (channel === "cataloguePurchase") {
      try {
        const { orgId, data } = JSON.parse(message);
        console.log("📥 Received notification from Redis:");

        // Forward to socket.io room
        io.to(`org_${orgId}`).emit("cataloguePurchase", data);
        io.to(`superadmin_global`).emit("cataloguePurchase", data);
        console.log(` Emitted notification to orgId_${orgId}:`);
      } catch (err) {
        console.error("Failed to parse notification:", err);
      }
    }
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("join_rooms", ({ userId, orgId,role}) => {
      socket.join(`user_${userId}`);
      console.log(` ${socket.id} joined user_${userId}`);

      if (orgId) {
        socket.join(`org_${orgId}`);
        console.log(` ${socket.id} joined org_${orgId}`);
      }
      if(role === 'superadmin'){
      socket.join(`superadmin_global`);
      console.log(` ${socket.id} joined superadmin_global`);
      } 
  });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};
