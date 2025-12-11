const appError = require("../app_error");
const { httpStatusText, httpStatusCodes } = require("../http_status");


const validateRoomId = (roomId) => {
    if (!roomId) {
        throw appError.createErrorResponse(
            "Room not found",
            httpStatusCodes.NOT_FOUND,
            httpStatusText.FAIL
        );
    }
};
const validateRoomCreation = (room) => {
    if (!room) {
        throw appError.createErrorResponse(
            "Room not found",
            httpStatusCodes.NOT_FOUND,
            httpStatusText.FAIL
        );
    }
}

const validateUserId = (userId) => {
    if (!userId) {
        throw appError.createErrorResponse(
            "User not found",
            httpStatusCodes.NOT_FOUND,
            httpStatusText.FAIL
        );
    }
};


const validateMessageId = (messageId) => {
    if (!messageId) {
        throw appError.createErrorResponse(
            "Message not found",
            httpStatusCodes.NOT_FOUND,
            httpStatusText.FAIL
        );
    }
};


const validateContent = (content, maxLength = 5000) => {
    if (!content) {
        throw appError.createErrorResponse(
            "Content is required",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    if (typeof content !== 'string') {
        throw appError.createErrorResponse(
            "Content must be a string",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    if (content.trim().length === 0) {
        throw appError.createErrorResponse(
            "Content cannot be empty",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    if (content.length > maxLength) {
        throw appError.createErrorResponse(
            `Content cannot exceed ${maxLength} characters`,
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }
};


const validatePaginationParams = (limit, offset) => {
    const DEFAULT_LIMIT = 50;
    const MAX_LIMIT = 100;

    let validatedLimit = parseInt(limit) || DEFAULT_LIMIT;
    let validatedOffset = parseInt(offset) || 0;

    if (validatedLimit > MAX_LIMIT) {
        validatedLimit = MAX_LIMIT;
    }

    if (validatedLimit < 1) {
        validatedLimit = DEFAULT_LIMIT;
    }

    if (validatedOffset < 0) {
        validatedOffset = 0;
    }

    return {
        limit: validatedLimit,
        offset: validatedOffset
    };
};

const validateUserAuthorization = (user) => {
    if (!user) {
        throw appError.createErrorResponse(
            "User is not authorized",
            httpStatusCodes.UNAUTHORIZED,
            httpStatusText.FAIL
        );
    }
}

/**
 * Room-specific validators
 */
const validateRoomData = (room_name, room_description, is_private) => {
    if (!room_name || !room_description || is_private === undefined) {
        throw appError.createErrorResponse(
            "All fields are required (room_name, room_description, is_private)",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    if (typeof room_name !== 'string' || room_name.trim().length === 0) {
        throw appError.createErrorResponse(
            "Room name must be a non-empty string",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    if (typeof room_description !== 'string' || room_description.trim().length === 0) {
        throw appError.createErrorResponse(
            "Room description must be a non-empty string",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    if (typeof is_private !== 'boolean') {
        throw appError.createErrorResponse(
            "is_private must be a boolean",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }
};

const validateRoomExists = (room) => {
    if (!room) {
        throw appError.createErrorResponse(
            "Room not found",
            httpStatusCodes.NOT_FOUND,
            httpStatusText.FAIL
        );
    }
};

const validateUserInRoom = (usersInRoom, userId) => {
    if (!usersInRoom || usersInRoom.length === 0) {
        throw appError.createErrorResponse(
            "Room has no members",
            httpStatusCodes.NOT_FOUND,
            httpStatusText.FAIL
        );
    }

    const userFound = usersInRoom.some((user) => user.id == userId);
    if (!userFound) {
        throw appError.createErrorResponse(
            "User not found in this room",
            httpStatusCodes.FORBIDDEN,
            httpStatusText.FAIL
        );
    }
};

module.exports = {
    validateRoomId,
    validateUserId,
    validateMessageId,
    validateContent,
    validatePaginationParams,
    validateRoomCreation,
    validateUserAuthorization,
    validateRoomData,
    validateRoomExists,
    validateUserInRoom
};
