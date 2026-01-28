const express = require('express');
const app = require('../../app');
const verifyToken = require('../../middlewares/verify_token');
const { roomCreationRules, validate } = require('../../middlewares/validn_schema');
const { sanitizeRoomData, sanitizeMessageContent } = require('../../middlewares/sanitization');
const { roomOperationLimiter, messageLimiter } = require('../../middlewares/rate_limiter');
const {
    createMessageRules,
    updateMessageRules,
    deleteMessageRules,
    getMessagesRules
} = require('../../utils/validators/room_message.validator');

const router = express.Router();
const chatsController = require('../../controller/chats/rooms.controller');
const messagesController = require('../../controller/chats/messages.controller');
const { body } = require('express-validator');
const isAllowedTo = require('../../middlewares/is_allowed');
const idempotencyMiddleware = require('../../middlewares/idempotency_validn');

// Room routes
router.get('/all-rooms', verifyToken, chatsController.getAllRooms);
router.get('/', verifyToken, chatsController.getRoomsForUser);
router.get('/:roomId', verifyToken, chatsController.getRoomById);
router.post('/create',
    verifyToken,
    roomOperationLimiter,  // Rate limit room creation
    sanitizeRoomData,  // Sanitize room data
    roomCreationRules(),
    validate,
    chatsController.createRoom
);
router.get('/:roomId/join', verifyToken, roomOperationLimiter, chatsController.joinRoom);
router.get('/:roomId/leave', verifyToken, roomOperationLimiter, chatsController.leaveRoom);

//route for approval of user to join room
router.get("/:roomId/approve/:userId", verifyToken, chatsController.approveUserToJoinRoom);
//route for getting users that are not approved to join room
router.get("/:roomId/non-approved-users", verifyToken, chatsController.nonApprovedUsers);

// router.put('/:roomId', verifyToken, isAllowedTo('admin'), chatsController.updateRoom);
// router.delete('/:roomId', verifyToken, isAllowedTo('admin'), chatsController.deleteRoom);

// Message routes
router.get('/:roomId/messages',
    verifyToken,
    getMessagesRules(),  // Validate room ID
    validate,
    messagesController.getMessages
);

router.post('/:roomId/messages',
    verifyToken,
    messageLimiter,  // Rate limit message creation
    idempotencyMiddleware,
    sanitizeMessageContent,  // Sanitize message content
    createMessageRules(),  // Enhanced validation
    validate,
    messagesController.createMessage
);

router.delete('/:roomId/messages/:messageId',
    verifyToken,
    deleteMessageRules(),  // Validate IDs
    validate,
    messagesController.deleteMessage
);

router.put('/:roomId/messages/:messageId',
    verifyToken,
    sanitizeMessageContent,  // Sanitize updated content
    updateMessageRules(),  // Enhanced validation
    validate,
    messagesController.updateMessage
);
module.exports = router;