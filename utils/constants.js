/**
 * Application Constants
 * Centralized location for all constant values
 */

// Message Constants
const MESSAGE_CONSTANTS = {
    MAX_CONTENT_LENGTH: 5000,
    DEFAULT_PAGINATION_LIMIT: 50,
    MAX_PAGINATION_LIMIT: 100,
    MESSAGE_STATUS: {
        SENT: 1,
        PENDING: 0,
        FAILED: -1
    }
};

// Room Constants
const ROOM_CONSTANTS = {
    MAX_ROOM_NAME_LENGTH: 100,
    MAX_ROOM_DESCRIPTION_LENGTH: 500
};

// User Constants
const USER_CONSTANTS = {
    MAX_USERNAME_LENGTH: 50,
    MIN_PASSWORD_LENGTH: 8
};

// Socket Events
const SOCKET_EVENTS = {
    NEW_MESSAGE: 'newMessage',
    MESSAGE_UPDATED: 'messageUpdated',
    MESSAGE_DELETED: 'messageDeleted',
    USER_TYPING: 'userTyping',
    USER_STOPPED_TYPING: 'userStoppedTyping',
    USER_JOINED_ROOM: 'userJoinedRoom',
    USER_LEFT_ROOM: 'userLeftRoom'
};

// Error Messages
const ERROR_MESSAGES = {
    ROOM_NOT_FOUND: 'Room not found',
    USER_NOT_FOUND: 'User not found',
    MESSAGE_NOT_FOUND: 'Message not found',
    CONTENT_REQUIRED: 'Content is required',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    INVALID_INPUT: 'Invalid input provided'
};

module.exports = {
    MESSAGE_CONSTANTS,
    ROOM_CONSTANTS,
    USER_CONSTANTS,
    SOCKET_EVENTS,
    ERROR_MESSAGES
};
