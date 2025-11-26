require("dotenv").config();
const port = process.env.PORT;
const { sequelize } = require("./configs/db.config");
// CRITICAL: Import all models so Sequelize knows which tables to sync
const { User, Room, UserRoom} = require("./models/relations/users_rooms_link");
const { Message } = require("./models/chats/messages.model");

// 2. Socket.IO Configuration (Imports server, io, and the handler setter)
// We need setSendMessageHandler to wire up the persistence logic
const {
  io,
  server,
  setSendMessageHandler,
} = require("./configs/socket.config");

const messageController = require("./controller/chats/messages.controller");


// A. Inject the IO instance into the controller (Allows controller to broadcast)
messageController.setIo(io);
//====================additional logic for clients just using socket.io not http===================
// B. Assign the persistence function to the Socket.IO 'sendMessage' event
// CRITICAL: This line defines what happens when a client sends a message.
setSendMessageHandler(async (socket, messageData) => {
  const { roomId, content, senderId } = messageData;

  if (!roomId || !content || !senderId) {
    socket.emit("error", { type: "validation", message: "Missing fields." });
    return;
  }

  try {
    await messageController.persistAndBroadcastMessage(
      senderId,
      roomId,
      content
    );
  } catch (error) {
    console.error(
      `[Socket Error] Failed to process message for room ${roomId}:`,
      error.message
    );
    socket.emit("error", {
      type: "persistence",
      message: "Failed to send message.",
    });
  }
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connection confirmed.");

    await sequelize.sync({ alter: true });
    console.log("Database synchronized.");

    // Use the custom HTTP server object to start listening
    server.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
      console.log(`[WebSocket] Socket.IO listening on port ${port}`);
    });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    // Exit if the database connection fails
    process.exit(1);
  }
}

startServer();
