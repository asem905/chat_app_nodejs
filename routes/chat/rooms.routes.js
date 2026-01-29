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
// Swagger
/**
 * @swagger
 * /api/v1/rooms/all-rooms:
 *   get:
 *     summary: Get all rooms
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: List of rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 */
router.get('/all-rooms', verifyToken, chatsController.getAllRooms);

/**
 * @swagger
 * /api/v1/rooms:
 *   get:
 *     summary: Get rooms for user
 *     tags: [Rooms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           format: Bearer
 *     responses:
 *       200:
 *         description: List of rooms for user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 */
router.get('/', verifyToken, chatsController.getRoomsForUser);

/**
 * @swagger
 * /api/v1/rooms/{roomId}:
 *   get:
 *     summary: Get room by ID
 *     tags: [Rooms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           format: Bearer
 *     responses:
 *       200:
 *         description: Room details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 */
router.get('/:roomId', verifyToken, chatsController.getRoomById);

/**
 * @swagger
 * /api/v1/rooms/create:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           format: Bearer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       201:
 *         description: Room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 */
router.post('/create',
    verifyToken,
    roomOperationLimiter,  // Rate limit room creation
    sanitizeRoomData,  // Sanitize room data
    roomCreationRules(),
    validate,
    chatsController.createRoom
);

/**
 * @swagger
 * /api/v1/rooms/{roomId}/join:
 *   get:
 *     summary: Join a room
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           format: Bearer
 *     responses:
 *       200:
 *         description: Room joined successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 */
router.get('/:roomId/join', verifyToken, roomOperationLimiter, chatsController.joinRoom);

/**
 * @swagger
 * /api/v1/rooms/{roomId}/leave:
 *   get:
 *     summary: Leave a room
 *     tags: [Rooms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           format: Bearer
 *     responses:
 *       200:
 *         description: Room left successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 */
router.get('/:roomId/leave', verifyToken, roomOperationLimiter, chatsController.leaveRoom);

//route for approval of user to join room
/**
 * @swagger
 * /api/v1/rooms/{roomId}/approve/{userId}:
 *   get:
 *     summary: Approve a user to join a room
 *     tags: [Rooms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           format: Bearer
 *     responses:
 *       200:
 *         description: User approved to join room successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 */
router.get("/:roomId/approve/:userId", verifyToken, chatsController.approveUserToJoinRoom);
//route for getting users that are not approved to join room
/**
 * @swagger
 * /api/v1/rooms/{roomId}/non-approved-users:
 *   get:
 *     summary: Get users that are not approved to join a room
 *     tags: [Rooms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           format: Bearer
 *     responses:
 *       200:
 *         description: List of users that are not approved to join room
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 */
router.get("/:roomId/non-approved-users", verifyToken, chatsController.nonApprovedUsers);

// router.put('/:roomId', verifyToken, isAllowedTo('admin'), chatsController.updateRoom);
// router.delete('/:roomId', verifyToken, isAllowedTo('admin'), chatsController.deleteRoom);

// Message routes
// Swagger
/**
 * @swagger
 * /api/v1/rooms/{roomId}/messages:
 *   get:
 *     summary: Get messages for a room
 *     tags: [Rooms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           format: Bearer
 *     responses:
 *       200:
 *         description: List of messages for the room
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 */
router.get('/:roomId/messages',
    verifyToken,
    getMessagesRules(),  // Validate room ID
    validate,
    messagesController.getMessages
);

// Swagger
/**
 * @swagger
 * /api/v1/rooms/{roomId}/messages:
 *   post:
 *     summary: Create a new message
 *     tags: [Rooms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           format: Bearer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Message'
 *     responses:
 *       201:
 *         description: Message created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */
router.post('/:roomId/messages',
    verifyToken,
    messageLimiter,  // Rate limit message creation
    idempotencyMiddleware,
    sanitizeMessageContent,  // Sanitize message content
    createMessageRules(),  // Enhanced validation
    validate,
    messagesController.createMessage
);

// Swagger
/**
 * @swagger
 * /api/v1/rooms/{roomId}/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Rooms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           format: Bearer
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */
router.delete('/:roomId/messages/:messageId',
    verifyToken,
    deleteMessageRules(),  // Validate IDs
    validate,
    messagesController.deleteMessage
);

// Swagger
/**
 * @swagger
 * /api/v1/rooms/{roomId}/messages/{messageId}:
 *   put:
 *     summary: Update a message
 *     tags: [Rooms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           format: Bearer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Message'
 *     responses:
 *       200:
 *         description: Message updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */
router.put('/:roomId/messages/:messageId',
    verifyToken,
    sanitizeMessageContent,  // Sanitize updated content
    updateMessageRules(),  // Enhanced validation
    validate,
    messagesController.updateMessage
);
module.exports = router;