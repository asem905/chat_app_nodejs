const messageService = require("../../services/message.service");
const socketService = require("../../services/socket.service");
const asyncWrapper = require("../../middlewares/async_wrapper");
const ResponseFormatter = require("../../utils/response.formatter");
const {
    validateRoomId,
    validateUserId,
    validateMessageId
} = require("../../utils/validators/room_message.validator");
const { httpStatusCodes } = require("../../utils/http_status");


const setIo = (io) => {
    socketService.setIo(io);
};

const getMessages = asyncWrapper(async (req, res, next) => {
    const roomId = req.params.roomId;
    const userId = req.currentUser.id;
    const limit = req.query.limit;
    const offset = req.query.offset;

    validateRoomId(roomId);
    validateUserId(userId);
    const result = await messageService.getMessages(userId, roomId, limit, offset);
    console.log("successfully fetched messages ",);
    return ResponseFormatter.paginated(
        res,
        httpStatusCodes.OK,
        result.messages,
        result.pagination
    );
});

const createMessage = asyncWrapper(async (req, res, next) => {
    const roomId = req.params.roomId;
    const userId = req.currentUser.id;
    const content = req.body.content;
    const parentMessageId = req.body.parent_message_id || null;

    validateRoomId(roomId);
    validateUserId(userId);

    const message = await messageService.createMessage(
        userId,
        roomId,
        content,
        parentMessageId
    );

    return ResponseFormatter.created(res, message, "Message sent successfully");
});

const updateMessage = asyncWrapper(async (req, res, next) => {
    const messageId = req.params.messageId;
    const userId = req.currentUser.id;
    const content = req.body.content;

    validateMessageId(messageId);
    validateUserId(userId);

    const message = await messageService.updateMessage(userId, messageId, content);

    return ResponseFormatter.updated(res, message, "Message updated successfully");
});

const deleteMessage = asyncWrapper(async (req, res, next) => {
    const messageId = req.params.messageId;
    const roomId = req.params.roomId;
    const userId = req.currentUser.id;

    validateMessageId(messageId);
    validateRoomId(roomId);
    validateUserId(userId);

    await messageService.deleteMessage(userId, messageId, roomId);

    return ResponseFormatter.deleted(res, "Message deleted successfully");
});

/**
 * Persist and broadcast message via Socket.IO
 * This is called from the socket event handler in index.js
 */
const persistAndBroadcastMessage = async (userId, roomId, content, parentMessageId = null) => {
    validateRoomId(roomId);
    validateUserId(userId);

    const message = await messageService.createMessage(
        userId,
        roomId,
        content,
        parentMessageId
    );

    return message;
};

module.exports = {
    getMessages,
    createMessage,
    updateMessage,
    deleteMessage,
    setIo,
    persistAndBroadcastMessage,
};
