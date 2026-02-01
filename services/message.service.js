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
        const messages = await messageRepository.findMessagesByRoom(roomId);
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
                total: totalCount,
            }
        };
    }


    async createMessage(userId, roomId, content, parentMessageId = null) {
        validateContent(content);
        await authorizationService.ensureUserInRoom(userId, roomId);

        // Validate parent message if provided
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

        // Get user info for message metadata
        const user = await userRepository.getUserById(userId);

        // Create message object (without DB id yet)
        const messageData = {
            user_id: userId,
            content: content.trim(),
            room_id: roomId,
            parent_message_id: parentMessageId,
            created_at: new Date()
        };

        // Publish to queue for batch processing (non-blocking)
        const queueService = require("./queue.service");
        const queued = await queueService.publishMessage(messageData);

        if (!queued) {
            // Fallback to direct DB write if queue is unavailable
            console.warn('[MessageService] Queue unavailable, falling back to direct DB write');
            const message = await messageRepository.createMessage(messageData);
            const messageResponse = {
                ...message.toJSON(),
                username: user.username,
                is_sent: 1
            };
            socketService.broadcastNewMessage(roomId, messageResponse);
            return message;
        }

        // Create temporary message object for immediate response
        console.log('[MessageService] ✅ Message queued successfully for room', roomId);
        const tempMessage = {
            ...messageData,
            id: null, // Will be assigned by DB later
            username: user.username,
            is_sent: 0, // Mark as pending (queued, not yet in DB)
            edited_at: null,
            deleted_at: null
        };
        console.log("before broadcast the message data: ", tempMessage);
        // Broadcast immediately for real-time user experience
        socketService.broadcastNewMessage(roomId, tempMessage);

        console.log('[MessageService] ✅ Message queued successfully for room', roomId);

        return tempMessage;
    }



    async updateMessage(userId, messageId, content) {

        validateContent(content);


        await authorizationService.canUpdateMessage(userId, messageId);


        const message = await messageRepository.updateMessage(messageId, content.trim());

        // Convert Sequelize model to plain object for socket broadcast
        const user = await userRepository.getUserById(message.user_id);
        const messageData = {
            ...message.toJSON(),
            username: user.username,
            is_sent: 1
        };

        socketService.broadcastMessageUpdate(message.room_id, messageData);

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
