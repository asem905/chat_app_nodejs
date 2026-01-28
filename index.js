require("dotenv").config();
const port = process.env.PORT;
const { sequelize } = require("./configs/db.config");
const startIdempotencyCleanup = require("./utils/idempotency_clean_up");
const { User, Room, UserRoom } = require("./models/relations/users_rooms_link");
const Message = require("./models/chats/messages.model");

const {
  io,
  server,
  setSendMessageHandler,
} = require("./configs/socket.config");

const messageController = require("./controller/chats/messages.controller");
const socketService = require("./services/socket.service");
messageController.setIo(io);
socketService.setIo(io);

setSendMessageHandler(async (socket, messageData, callback) => {
  const { roomId, content, senderId } = messageData;

  if (!roomId || !content || !senderId) {
    const errorResponse = {
      type: "validation",
      message: "Missing required fields: roomId, content, or senderId"
    };

    socket.emit("error", errorResponse);

    if (callback) {
      callback({ status: 'error', ...errorResponse });
    }
    return;
  }

  try {
    const message = await messageController.persistAndBroadcastMessage(
      senderId,
      roomId,
      content
    );

    console.log(`[Socket Success] Message sent in room ${roomId}:`, message.id);

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

    const userRepository = require("./repositories/user.repository");
    const bloomFilterService = require("./services/bloom_filter.service");

    const emails = await userRepository.getAllEmails();
    await bloomFilterService.initialize(emails);

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