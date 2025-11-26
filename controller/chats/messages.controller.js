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
  console.log(message); 

  if (ioInstance) {
    ioInstance.to(roomId).emit("newMessage", message);
    return message;
  } else {
    console.warn("Socket.IO instance not initialized. Message not broadcast.");
    return message;
  }
};

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
  const messages = await Message.findAll({ where: { room_id: roomId } });
  if (!messages || messages.length === 0) {
    const error = appError.createErrorResponse(
      "Messages not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res
      .status(httpStatusCodes.NOT_FOUND)
      .json({ status: httpStatusText.FAIL, ...error });
  }
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

module.exports = {
  getMessages,
  createMessage,
  deleteMessage,
  replyToMessage,
  persistAndBroadcastMessage,
  setIo, 
};
