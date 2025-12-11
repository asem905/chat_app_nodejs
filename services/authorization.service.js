const messageRepository = require("../repositories/message.repository");
const appError = require("../utils/app_error");
const { httpStatusText, httpStatusCodes } = require("../utils/http_status");
const roomRepository = require("../repositories/room.repository");
/**
 * Authorization Service for message-related permissions
 * Centralizes authorization logic
 */
class AuthorizationService {
    async canDeleteMessage(userId, messageId, roomId) {
        const message = await messageRepository.findMessageByIdAndRoom(messageId, roomId);

        if (!message) {
            throw appError.createErrorResponse(
                "Message not found",
                httpStatusCodes.NOT_FOUND,
                httpStatusText.FAIL
            );
        }
        const roomCreatorId = await messageRepository.getRoomCreatorId(roomId);
        console.log("roomCreatorId", roomCreatorId);
        console.log("userId", userId);
        console.log("message.user_id", message.user_id);
        if (message.user_id === userId || roomCreatorId === userId) {
            return true;
        }

        throw appError.createErrorResponse(
            "You are not authorized to delete this message",
            httpStatusCodes.UNAUTHORIZED,
            httpStatusText.FAIL
        );
    }


    async canUpdateMessage(userId, messageId) {
        const message = await messageRepository.findMessageById(messageId);

        if (!message) {
            throw appError.createErrorResponse(
                "Message not found",
                httpStatusCodes.NOT_FOUND,
                httpStatusText.FAIL
            );
        }

        if (message.user_id !== userId) {
            throw appError.createErrorResponse(
                "You are not authorized to update this message",
                httpStatusCodes.UNAUTHORIZED,
                httpStatusText.FAIL
            );
        }

        return true;
    }

    async ensureUserInRoom(userId, roomId) {
        const isInRoom = await messageRepository.isUserInRoom(userId, roomId);

        if (!isInRoom) {
            throw appError.createErrorResponse(
                "Room not found",
                httpStatusCodes.NOT_FOUND,
                httpStatusText.FAIL
            );
        }
        console.log("authorized")
        return true;
    }

    /**
     * Room Authorization Methods
     */
    async isRoomOwner(userId, roomId) {
        const ownerCheck = await roomRepository.checkRoomOwner(userId, roomId);
        if (!ownerCheck) {
            throw appError.createErrorResponse(
                "You are not the owner of this room",
                httpStatusCodes.FORBIDDEN,
                httpStatusText.FAIL
            );
        }
        return true;
    }

    async canApproveUser(ownerId, roomId) {
        return await this.isRoomOwner(ownerId, roomId);
    }

    async canViewNonApprovedUsers(userId, roomId) {
        return await this.isRoomOwner(userId, roomId);
    }
}

module.exports = new AuthorizationService();

