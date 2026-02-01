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
    const DEFAULT_LIMIT = 200;
    const MAX_LIMIT = 500;

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

const { body, param } = require('express-validator');
const validator = require('validator');

/**
 * Express-validator rules for message operations
 * Enhanced validation with XSS and injection protection
 */

/**
 * Validation rules for message creation
 */
const createMessageRules = () => {
    return [
        body('content')
            .trim()
            .notEmpty()
            .withMessage('Message content is required')
            .isLength({ min: 1, max: parseInt(process.env.MAX_MESSAGE_LENGTH) || 5000 })
            .withMessage(`Message content must be between 1 and ${process.env.MAX_MESSAGE_LENGTH || 5000} characters`)
            .custom((value) => {
                // Check for suspicious patterns
                const suspiciousPatterns = [
                    /<script/i,
                    /javascript:/i,
                    /on\w+\s*=/i, // inline event handlers
                ];

                if (suspiciousPatterns.some(pattern => pattern.test(value))) {
                    throw new Error('Message contains invalid content');
                }
                return true;
            }),

        body('parent_message_id')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Invalid parent message ID'),
    ];
};

/**
 * Validation rules for message update
 */
const updateMessageRules = () => {
    return [
        param('messageId')
            .isInt({ min: 1 })
            .withMessage('Invalid message ID'),

        body('content')
            .trim()
            .notEmpty()
            .withMessage('Message content is required')
            .isLength({ min: 1, max: parseInt(process.env.MAX_MESSAGE_LENGTH) || 5000 })
            .withMessage(`Message content must be between 1 and ${process.env.MAX_MESSAGE_LENGTH || 5000} characters`)
            .custom((value) => {
                const suspiciousPatterns = [
                    /<script/i,
                    /javascript:/i,
                    /on\w+\s*=/i,
                ];

                if (suspiciousPatterns.some(pattern => pattern.test(value))) {
                    throw new Error('Message contains invalid content');
                }
                return true;
            }),
    ];
};

/**
 * Validation rules for message deletion
 */
const deleteMessageRules = () => {
    return [
        param('messageId')
            .isInt({ min: 1 })
            .withMessage('Invalid message ID'),

        param('roomId')
            .isInt({ min: 1 })
            .withMessage('Invalid room ID'),
    ];
};

/**
 * Validation rules for getting messages
 */
const getMessagesRules = () => {
    return [
        param('roomId')
            .isInt({ min: 1 })
            .withMessage('Invalid room ID'),
    ];
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
    validateUserInRoom,
    // Enhanced express-validator rules
    createMessageRules,
    updateMessageRules,
    deleteMessageRules,
    getMessagesRules,
};
