const express = require('express');
const app = require('../../app');
const verifyToken = require('../../middlewares/verify_token');
const { roomCreationRules, validate } = require('../../middlewares/validn_schema');
const router = express.Router();
const chatsController = require('../../controller/chats/rooms.controller');
const messagesController = require('../../controller/chats/messages.controller');
const { body } = require('express-validator');
const isAllowedTo = require('../../middlewares/is_allowed');

// Room routes
router.get('/all-rooms', verifyToken, isAllowedTo('admin'), chatsController.getAllRooms);
router.get('/', verifyToken, chatsController.getRoomsForUser);
router.get('/:roomId', verifyToken, chatsController.getRoomById);
router.post('/create', verifyToken, roomCreationRules(), validate, chatsController.createRoom);
router.get('/:roomId/join', verifyToken, chatsController.joinRoom);
router.get('/:roomId/leave', verifyToken, chatsController.leaveRoom);

// Message routes
router.get('/:roomId/messages', verifyToken, messagesController.getMessages);
router.post('/:roomId/messages', verifyToken, messagesController.createMessage);
router.delete('/:roomId/messages/:messageId', verifyToken, messagesController.deleteMessage);
router.post('/:roomId/messages/:messageId/reply', verifyToken, messagesController.replyToMessage);

module.exports = router;