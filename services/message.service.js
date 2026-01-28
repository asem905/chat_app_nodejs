const messageRepository = require("../repositories/message.repository");
const socketService = require("./socket.service");
const authorizationService = require("./authorization.service");
const {
    validateContent,
    validatePaginationParams
} = require("../utils/validators/room_message.validator");
const appError = require("../utils/app_error");
const { httpStatusText, httpStatusCodes } = require("../utils/http_status");
const userRepository = require("../repositories/user.repository");

/**
 * Message Service - Business Logic Layer
 * Handles all message related business operations that accessed by controllers
 */
class MessageService {


    async getMessages(userId, roomId, limit, offset) {
        const authorized = await authorizationService.ensureUserInRoom(userId, roomId);
        const { limit: validLimit, offset: validOffset } = validatePaginationParams(limit, offset);
        const messages = await messageRepository.findMessagesByRoom(roomId, validLimit, validOffset);
        const totalCount = await messageRepository.countMessagesByRoom(roomId);
        const formattedMessages = await Promise.all(messages.map(async message => {
            const messageData = message.toJSON();
            const user = await userRepository.getUserById(messageData.user_id);
            return {
                ...messageData,
                username: user.username || "Unknown",
                is_sent: 1
            };
        }));
        return {
            messages: formattedMessages,
            pagination: {
                limit: validLimit,
                offset: validOffset,
                total: totalCount,
                hasMore: validOffset + validLimit < totalCount
            }
        };
    }


    async createMessage(userId, roomId, content, parentMessageId = null) {
        validateContent(content);
        await authorizationService.ensureUserInRoom(userId, roomId);
        if (parentMessageId) {
            const parentMessage = await messageRepository.findMessageByIdAndRoom(parentMessageId, roomId);
            if (!parentMessage) {
                throw appError.createErrorResponse(
                    "Parent message not found",
                    httpStatusCodes.NOT_FOUND,
                    httpStatusText.FAIL
                );
            }
        }


        const message = await messageRepository.createMessage({
            user_id: userId,
            content: content.trim(),
            room_id: roomId,
            parent_message_id: parentMessageId
        });

        if (!message) {
            throw appError.createErrorResponse(
                "Message creation failed",
                httpStatusCodes.INTERNAL_SERVER_ERROR,
                httpStatusText.ERROR
            );
        }


        socketService.broadcastNewMessage(roomId, message);

        return message;
    }


    async updateMessage(userId, messageId, content) {

        validateContent(content);


        await authorizationService.canUpdateMessage(userId, messageId);


        const message = await messageRepository.updateMessage(messageId, content.trim());


        socketService.broadcastMessageUpdate(message.room_id, message);

        return message;
    }

    async deleteMessage(userId, messageId, roomId) {
        await authorizationService.ensureUserInRoom(userId, roomId);

        const canDelete = await authorizationService.canDeleteMessage(userId, messageId, roomId);

        if (!canDelete) {
            throw appError.createErrorResponse(
                "You are not authorized to delete this message",
                httpStatusCodes.FORBIDDEN,
                httpStatusText.FAIL
            );
        }

        await messageRepository.deleteMessage(messageId);

        socketService.broadcastMessageDeletion(roomId, messageId);
    }


    async getMessageById(userId, messageId, roomId) {
        await authorizationService.ensureUserInRoom(userId, roomId);

        const message = await messageRepository.findMessageByIdAndRoom(messageId, roomId);

        if (!message) {
            throw appError.createErrorResponse(
                "Message not found",
                httpStatusCodes.NOT_FOUND,
                httpStatusText.FAIL
            );
        }

        return message;
    }
}

module.exports = new MessageService();
