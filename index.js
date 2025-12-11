require("dotenv").config();
const port = process.env.PORT;
const { sequelize } = require("./configs/db.config");
const startIdempotencyCleanup = require("./utils/idempotency_clean_up");
// CRITICAL: Import all models so Sequelize knows which tables to sync
const { User, Room, UserRoom } = require("./models/relations/users_rooms_link");
const Message = require("./models/chats/messages.model"); // FIX: Remove destructuring

// 2. Socket.IO Configuration
const {
  io,
  server,
  setSendMessageHandler,
} = require("./configs/socket.config");

const messageController = require("./controller/chats/messages.controller");

// A. Inject the IO instance into the controller
messageController.setIo(io);

// B. Assign the persistence function to the Socket.IO 'sendMessage' event
setSendMessageHandler(async (socket, messageData, callback) => { // FIX: Added callback parameter
  const { roomId, content, senderId } = messageData;

  // Validation
  if (!roomId || !content || !senderId) {
    const errorResponse = {
      type: "validation",
      message: "Missing required fields: roomId, content, or senderId"
    };

    socket.emit("error", errorResponse);

    // FIX: Send error via callback too
    if (callback) {
      callback({ status: 'error', ...errorResponse });
    }
    return;
  }

  try {
    // FIX: Capture the returned message
    const message = await messageController.persistAndBroadcastMessage(
      senderId,
      roomId,
      content
    );

    console.log(`[Socket Success] Message sent in room ${roomId}:`, message.id);

    // FIX: Send success acknowledgment
    if (callback) {
      callback({
        status: 'success',
        data: message
      });
    }

  } catch (error) {
    console.error(
      `[Socket Error] Failed to process message for room ${roomId}:`,
      error.message
    );

    const errorResponse = {
      type: error.statusCode === 404 ? "not_found" : "persistence",
      message: error.message || "Failed to send message.",
    };

    socket.emit("error", errorResponse);

    // FIX: Send error via callback
    if (callback) {
      callback({ status: 'error', ...errorResponse });
    }
  }
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection confirmed.");

    await sequelize.sync({ alter: false });
    console.log("✅ Database synchronized.");

    startIdempotencyCleanup();
    // Start the server
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server is running on http://localhost:${port}`);
      console.log(`📡 Socket.IO listening on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    process.exit(1);
  }
}

startServer();