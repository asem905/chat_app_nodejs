const express = require('express');
const app = require('../../app');
const verifyToken = require('../../middlewares/verify_token');
const { roomCreationRules, validate } = require('../../middlewares/validn_schema');
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
router.post('/create', verifyToken, roomCreationRules(), validate, chatsController.createRoom);
router.get('/:roomId/join', verifyToken, chatsController.joinRoom);
router.get('/:roomId/leave', verifyToken, chatsController.leaveRoom);
//route for approval of user to join room
router.get("/:roomId/approve/:userId", verifyToken, chatsController.approveUserToJoinRoom);
//route for getting users that are not approved to join room
router.get("/:roomId/non-approved-users", verifyToken, chatsController.nonApprovedUsers);
// router.put('/:roomId', verifyToken, isAllowedTo('admin'), chatsController.updateRoom);
// router.delete('/:roomId', verifyToken, isAllowedTo('admin'), chatsController.deleteRoom);
// Message routes
router.get('/:roomId/messages', verifyToken, messagesController.getMessages);
router.post('/:roomId/messages', verifyToken, idempotencyMiddleware, messagesController.createMessage);
router.delete('/:roomId/messages/:messageId', verifyToken, messagesController.deleteMessage);
router.put('/:roomId/messages/:messageId', verifyToken, messagesController.updateMessage);
module.exports = router;