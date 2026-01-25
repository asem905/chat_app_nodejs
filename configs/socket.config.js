const http = require("http");
const { Server } = require("socket.io");
const app = require("../app");
const jwt = require("jsonwebtoken");
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
  console.log(`[Socket] Client connected: ${socket.id}`);

  // 1. JOIN A ROOM
  socket.on("joinRoom", (roomId, callback) => {
    socket.join(roomId);
    console.log(`[Socket] ${socket.id} joined room: ${roomId}`);

    if (callback) {
      callback({ status: "ok", message: `Joined room ${roomId}` });
    }
  });

  // 2. LISTEN FOR NEW MESSAGES
  socket.on("sendMessage", (data, callback) => {
    // ✅ CHANGED: Add callback
    sendMessageHandler(socket, data, callback); // ✅ CHANGED: Pass callback
  });

  // 3. DISCONNECT
  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });

  // 4. Typing indicators

  socket.on("typing", ({ roomId, username }) => {
    console.log(`👤 User ${username} is typing in room ${roomId}`);

    // Broadcast to all users in the room EXCEPT the sender
    socket.to(roomId).emit("userTyping", {
      roomId: parseInt(roomId),
      userId: socket.userId, // Assuming you store userId in socket object
      username: username,
      isTyping: true,
    });
  });
  // 5. Handle stop typing event
  socket.on("stopTyping", ({ roomId, username }) => {
    console.log(`👤 User ${username} stopped typing in room ${roomId}`);

    // Broadcast to all users in the room EXCEPT the sender
    socket.to(roomId).emit("userStoppedTyping", {
      roomId: parseInt(roomId),
      userId: socket.userId,
      username: username,
      isTyping: false,
    });
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
