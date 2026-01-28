const http = require("http");
const { Server } = require("socket.io");
const app = require("../app");
const jwt = require("jsonwebtoken");
const socketService = require("../services/socket.service");
const socketRoomAccess = require("../middlewares/socket_room_access");
const { socketRateLimiter } = require("../middlewares/rate_limiter");
const { sanitizeSocketData } = require("../middlewares/sanitization");
require("dotenv").config();

// 1. Create the HTTP server using your Express app
const server = http.createServer(app);

// 2. Initialize Socket.IO Server
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// --- Socket.IO Event Handling placeholder ---
let sendMessageHandler = (socket, data, callback) => {
  // ✅ Add callback parameter
  console.log("[Socket] Message received, handler not yet assigned.");
};
io.use((socket, next) => {
  // Client sends auth data via the 'auth' object in setAuth({...})
  const token =
    socket.handshake.auth.token || socket.handshake.auth.Authorization;
  if (token) {
    // Verify and decode the JWT token
    const tokenStr = token.split(" ")[1].toString();
    jwt.verify(tokenStr, process.env.SERVER_SECRET_KEY, (err, decoded) => {
      if (err) {
        console.log(`[Socket Auth] Token verification failed:`, err.message);
        const authError = new Error("Authentication error: Invalid token.");
        authError.data = { message: "Token verification failed" };
        return next(authError);
      }

      // Store user information in socket object for later use
      socket.userId = decoded.id;
      socket.username = decoded.username;

      console.log(`[Socket Auth] User ${decoded.username} (ID: ${decoded.id}) authenticated for socket ${socket.id}`);
      next();
    });
  } else {
    // Reject connection if token is missing (or validation fails)
    console.log(`[Socket Auth] Connection rejected: No token provided.`);
    const error = new Error("Authentication error: Token required.");
    error.data = { message: "Invalid token or missing credentials" };
    next(error);
  }
});
io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id} (User: ${socket.username}, ID: ${socket.userId})`);

  // 1. JOIN A ROOM (with access control)
  socket.on("joinRoom", async (roomId, callback) => {
    try {
      // Rate limit check
      if (!socketRateLimiter.checkLimit(socket.id)) {
        const error = {
          status: "error",
          type: "rate_limit_exceeded",
          message: "Too many events. Please slow down."
        };
        socket.emit("error", error);
        if (callback) callback(error);
        return;
      }

      // Validate room ID
      const parsedRoomId = parseInt(roomId);
      if (!parsedRoomId || parsedRoomId < 1) {
        const error = { status: "error", type: "invalid_room", message: "Invalid room ID" };
        socket.emit("error", error);
        if (callback) callback(error);
        return;
      }

      // Check room access
      const accessCheck = await socketRoomAccess.canJoinRoom(socket.userId, parsedRoomId);

      if (!accessCheck.allowed) {
        console.warn(`[Socket] User ${socket.userId} denied access to room ${roomId}: ${accessCheck.message}`);
        const error = {
          status: "error",
          type: accessCheck.errorType,
          message: accessCheck.message
        };
        socket.emit("roomAccessDenied", error);
        if (callback) callback(error);
        return;
      }

      // Access granted - join the room
      socket.join(roomId.toString());
      console.log(`[Socket] ✅ User ${socket.username} (${socket.userId}) joined room: ${roomId}`);

      if (callback) {
        callback({
          status: "ok",
          message: `Joined room ${roomId}`,
          room: accessCheck.room
        });
      }
    } catch (error) {
      console.error(`[Socket] Error in joinRoom:`, error);
      const errorResponse = {
        status: "error",
        type: "server_error",
        message: "Failed to join room"
      };
      socket.emit("error", errorResponse);
      if (callback) callback(errorResponse);
    }
  });

  // 2. LISTEN FOR NEW MESSAGES (with access control)
  socket.on("sendMessage", async (data, callback) => {
    try {
      // Rate limit check
      console.log(`[Socket] User ${socket.userId} (${socket.username}) sending message to room: ${data.roomId}`);
      if (!socketRateLimiter.checkLimit(socket.id)) {
        console.log(`[Socket] User ${socket.userId} (${socket.username}) rate limited for message send`);
        const error = {
          status: "error",
          type: "rate_limit_exceeded",
          message: "You're sending messages too quickly. Please slow down."
        };
        socket.emit("error", error);
        if (callback) callback(error);
        return;
      }

      // Sanitize input data
      const sanitizedData = sanitizeSocketData(data);

      // Verify room access before sending message
      if (sanitizedData.roomId) {
        const accessCheck = await socketRoomAccess.canSendMessage(socket.userId, sanitizedData.roomId);

        if (!accessCheck.allowed) {
          console.warn(`[Socket] User ${socket.userId} denied message send to room ${sanitizedData.roomId}: ${accessCheck.message}`);
          const error = {
            status: "error",
            type: accessCheck.errorType,
            message: accessCheck.message
          };
          socket.emit("error", error);
          if (callback) callback(error);
          return;
        }
      }

      // Access granted - process message
      sendMessageHandler(socket, sanitizedData, callback);
    } catch (error) {
      console.error(`[Socket] Error in sendMessage:`, error);
      const errorResponse = {
        status: "error",
        type: "server_error",
        message: "Failed to send message"
      };
      socket.emit("error", errorResponse);
      if (callback) callback(errorResponse);
    }
  });

  // 3. DISCONNECT (cleanup rate limiter)
  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id} (User: ${socket.username})`);
    // Clean up rate limiter tracking
    socketRateLimiter.removeSocket(socket.id);
  });

  // 4. Typing indicators (with access control)
  socket.on("typing", async (data, callback) => {
    console.log(`[Socket] 📝 TYPING event received from ${socket.username}:`, data);
    try {
      const { roomId, username } = data || {};

      if (!roomId) {
        console.error(`[Socket] ❌ TYPING event missing roomId from user ${socket.userId}`);
        return;
      }

      // Rate limit check
      if (!socketRateLimiter.checkLimit(socket.id)) {
        console.log(`[Socket] User ${socket.userId} rate limited for typing event`);
        return; // Silently ignore if rate limited
      }

      // Verify room membership
      const hasAccess = await socketRoomAccess.verifyRoomMembership(socket.userId, parseInt(roomId));
      if (!hasAccess) {
        console.warn(`[Socket] User ${socket.userId} tried to send typing event to unauthorized room ${roomId}`);
        return;
      }

      console.log(`👤 User ${username || socket.username} is typing in room ${roomId}`);

      // Use SocketService for consistent broadcasting
      socketService.broadcastTyping(roomId, {
        roomId: parseInt(roomId),
        userId: socket.userId,
        username: username || socket.username,
        isTyping: true,
      }, socket.id);

      if (callback) callback({ status: 'ok' });
    } catch (error) {
      console.error(`[Socket] Error in typing event:`, error);
      if (callback) callback({ status: 'error', message: error.message });
    }
  });

  // 5. Handle stop typing event (with access control)
  socket.on("stopTyping", async (data, callback) => {
    console.log(`[Socket] ✋ STOP TYPING event received from ${socket.username}:`, data);
    try {
      const { roomId, username } = data || {};

      if (!roomId) {
        console.error(`[Socket] ❌ STOP TYPING event missing roomId from user ${socket.userId}`);
        return;
      }

      // Rate limit check
      if (!socketRateLimiter.checkLimit(socket.id)) {
        return; // Silently ignore if rate limited
      }

      // Verify room membership
      const hasAccess = await socketRoomAccess.verifyRoomMembership(socket.userId, parseInt(roomId));
      if (!hasAccess) {
        console.warn(`[Socket] User ${socket.userId} tried to send stopTyping event to unauthorized room ${roomId}`);
        return;
      }

      console.log(`👤 User ${username || socket.username} stopped typing in room ${roomId}`);

      // Use SocketService for consistent broadcasting
      socketService.broadcastStopTyping(roomId, {
        roomId: parseInt(roomId),
        userId: socket.userId,
        username: username || socket.username,
        isTyping: false,
      }, socket.id);

      if (callback) callback({ status: 'ok' });
    } catch (error) {
      console.error(`[Socket] Error in stopTyping event:`, error);
      if (callback) callback({ status: 'error', message: error.message });
    }
  });
});

// Export the HTTP server, the IO instance, and the function to set the handler
module.exports = {
  server,
  io,
  setSendMessageHandler: (handler) => {
    sendMessageHandler = handler;
  },
};
