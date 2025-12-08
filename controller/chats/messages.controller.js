const Message = require("../../models/chats/messages.model");
const {
  User,
  Room,
  UserRoom,
} = require("../../models/relations/users_rooms_link");
const asyncWrapper = require("../../middlewares/async_wrapper");
const appError = require("../../utils/app_error");
const { httpStatusText, httpStatusCodes } = require("../../utils/http_status");

let ioInstance = null; // Variable to hold the injected Socket.IO instance

const setIo = (io) => {
  ioInstance = io;
};

const persistAndBroadcastMessage = async (userId, roomId, content) => {
  await checkIsUserInRoom(userId, roomId);

  const message = await Message.create({
    user_id: userId,
    content: content,
    room_id: roomId,
  });

  if (!message) {
    throw new Error("Message persistence failed.");
  }

  if (ioInstance) {
    ioInstance.to(roomId).emit("newMessage", message);
    console.log(`[Socket Success] Message sent in room ${roomId}:`, message.id);
    return message;
  } else {
    console.warn("Socket.IO instance not initialized. Message not broadcast.");
    return message;
  }
};
const updateMessageAndBroadcast = async (messageId, content) => {
  var message = await Message.findOne({ where: { id: messageId } });
  if (!message) {
    throw new Error("Message not found.");
  }
  message.content = content;
  await message.save();
  if (ioInstance) {
    ioInstance.to(message.room_id).emit("messageUpdated", message);
    console.log(
      `[Socket Success] Message updated in room ${message.room_id}:`,
      message.id
    );
  }
  return message;
}
const checkIsUserInRoom = async (userId, roomId) => {
  const isUserInRoom = await UserRoom.findOne({
    where: { user_id: userId, room_id: roomId },
  });
  if (!isUserInRoom) {
    const error = appError.createErrorResponse(
      "Room not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    throw error;
  }
};

const getMessages = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId;
  const messagesLimit = req.query.limit;
  if (!roomId) {
    const error = appError.createErrorResponse(
      "Room not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res
      .status(httpStatusCodes.NOT_FOUND)
      .json({ status: httpStatusText.FAIL, ...error });
  }
  const allMessages = await Message.findAll({
    where: { room_id: roomId },
    limit: messagesLimit,
  });

  const userPromises = allMessages.map((e) =>
    User.findOne({ where: { id: e.user_id } })
  );
  const users = await Promise.all(userPromises);

  const messages = allMessages.map((message, index) => ({
    ...message.toJSON(), // Include all message fields
    username: users[index]?.username || "Unknown",
    is_sent:1
  }));

  return res
    .status(httpStatusCodes.OK)
    .json({ status: httpStatusText.SUCCESS, data: messages });
});

const createMessage = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId;
  if (!roomId) {
    const error = appError.createErrorResponse(
      "Room not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return next(error);
  }
  const userId = req.currentUser.id;
  if (!userId) {
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return next(error);
  }
  const content = req.body.content;
  if (!content) {
    const error = appError.createErrorResponse(
      "Content not found",
      httpStatusCodes.BAD_REQUEST,
      httpStatusText.FAIL
    );
    return next(error);
  }
  try {
    const message = await persistAndBroadcastMessage(userId, roomId, content);
    // Send success response for the HTTP request
    return res
      .status(httpStatusCodes.CREATED)
      .json({ status: httpStatusText.SUCCESS, data: message });
  } catch (err) {
    // If persistence/checkIsUserInRoom throws an error, catch and pass to global handler
    return next(err);
  }
});

const deleteMessage = asyncWrapper(async (req, res) => {
  const messageId = req.params.messageId;
  if (!messageId) {
    const error = appError.createErrorResponse(
      "Message not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  const roomId = req.params.roomId;
  if (!roomId) {
    const error = appError.createErrorResponse(
      "Room not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  const userId = req.currentUser.id;
  if (!userId) {
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  await checkIsUserInRoom(userId, roomId);
  const message = await Message.findOne({
    where: { id: messageId, room_id: roomId },
  });
  if (!message) {
    const error = appError.createErrorResponse(
      "Message not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  } //as if user is creator so he can delete anything
  if (message.user_id !== userId) {
    const room = await Room.findOne({ where: { id: roomId } });
    if (room.room_created_by === userId) {
      // Use room_created_by from model
      await message.destroy();
      return res.status(httpStatusCodes.OK).json({
        // FIX: Added return
        status: httpStatusText.SUCCESS,
        data: "Message deleted successfully",
      });
    } else {
      const error = appError.createErrorResponse(
        "You are not authorized to delete this message",
        httpStatusCodes.UNAUTHORIZED,
        httpStatusText.FAIL
      );
      return res.status(httpStatusCodes.UNAUTHORIZED).json({ ...error });
    }
  } else {
    await message.destroy();
    return res.status(httpStatusCodes.OK).json({
      status: httpStatusText.SUCCESS,
      data: "Message deleted successfully",
    });
  }
});

const replyToMessage = asyncWrapper(async (req, res) => {
  const parentMessageId = req.params.messageId;
  if (!parentMessageId) {
    const error = appError.createErrorResponse(
      "Message not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  const userId = req.currentUser.id;
  if (!userId) {
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  } // Todo is to make the room id stored in req.currentUser
  const roomId = req.params.roomId;
  if (!roomId) {
    const error = appError.createErrorResponse(
      "Room not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }

  await checkIsUserInRoom(userId, roomId);

  const content = req.body.content;
  const message = await Message.create({
    user_id: userId,
    content: content,
    room_id: roomId,
    parent_message_id: parentMessageId,
  });
  if (!message) {
    const error = appError.createErrorResponse(
      "Message not created",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  return res
    .status(httpStatusCodes.OK)
    .json({ status: httpStatusText.SUCCESS, data: message });
});

const updateMessage=asyncWrapper(async (req, res) => {
  const messageId = req.params.messageId;
  if (!messageId) {
    const error = appError.createErrorResponse(
      "Message not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  const userId = req.currentUser.id;
  if (!userId) {
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  var message = await Message.findOne({ where: { id: messageId } });
  if (!message) {
    const error = appError.createErrorResponse(
      "Message not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  if (message.user_id !== userId) {
    const error = appError.createErrorResponse(
      "You are not authorized to update this message",
      httpStatusCodes.UNAUTHORIZED,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.UNAUTHORIZED).json({ ...error });
  }
  var content = req.body.content;
  if (!content) {
    const error = appError.createErrorResponse(
      "Content is required",
      httpStatusCodes.BAD_REQUEST,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.BAD_REQUEST).json({ ...error });
  }
  message=await updateMessageAndBroadcast(messageId, content);
  await message.save();
  return res
    .status(httpStatusCodes.OK)
    .json({ status: httpStatusText.SUCCESS, data: message });
})
module.exports = {
  getMessages,
  createMessage,
  deleteMessage,
  replyToMessage,
  persistAndBroadcastMessage,
  setIo,
  updateMessage
};
