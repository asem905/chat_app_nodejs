/**
 * Unit Tests for Message Service
 * Demonstrates how the refactored code is easier to test
 */

// Mock dependencies
jest.mock('../repositories/message.repository');
jest.mock('./socket.service');
jest.mock('./authorization.service');

const messageService = require('./message.service');
const messageRepository = require('../repositories/message.repository');
const socketService = require('./socket.service');
const authorizationService = require('./authorization.service');

describe('MessageService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createMessage', () => {
        test('should create message successfully', async () => {
            // Arrange
            const userId = 1;
            const roomId = 1;
            const content = 'Test message';
            const mockMessage = {
                id: 1,
                user_id: userId,
                room_id: roomId,
                content,
                created_at: new Date()
            };

            authorizationService.ensureUserInRoom.mockResolvedValue(true);
            messageRepository.createMessage.mockResolvedValue(mockMessage);
            socketService.broadcastNewMessage.mockReturnValue(undefined);

            // Act
            const result = await messageService.createMessage(userId, roomId, content);

            // Assert
            expect(result).toEqual(mockMessage);
            expect(authorizationService.ensureUserInRoom).toHaveBeenCalledWith(userId, roomId);
            expect(messageRepository.createMessage).toHaveBeenCalledWith({
                user_id: userId,
                content,
                room_id: roomId,
                parent_message_id: null
            });
            expect(socketService.broadcastNewMessage).toHaveBeenCalledWith(roomId, mockMessage);
        });

        test('should throw error for empty content', async () => {
            // Arrange
            const userId = 1;
            const roomId = 1;
            const content = '';

            // Act & Assert
            await expect(
                messageService.createMessage(userId, roomId, content)
            ).rejects.toThrow('Content is required');
        });

        test('should throw error for content exceeding max length', async () => {
            // Arrange
            const userId = 1;
            const roomId = 1;
            const content = 'a'.repeat(5001); // Exceeds 5000 char limit

            // Act & Assert
            await expect(
                messageService.createMessage(userId, roomId, content)
            ).rejects.toThrow('Content cannot exceed 5000 characters');
        });

        test('should validate parent message exists for replies', async () => {
            // Arrange
            const userId = 1;
            const roomId = 1;
            const content = 'Reply message';
            const parentMessageId = 999;

            authorizationService.ensureUserInRoom.mockResolvedValue(true);
            messageRepository.findMessageByIdAndRoom.mockResolvedValue(null);

            // Act & Assert
            await expect(
                messageService.createMessage(userId, roomId, content, parentMessageId)
            ).rejects.toThrow('Parent message not found');
        });
    });

    describe('getMessages', () => {
        test('should return paginated messages', async () => {
            // Arrange
            const userId = 1;
            const roomId = 1;
            const limit = 10;
            const offset = 0;

            const mockMessages = [
                {
                    id: 1,
                    content: 'Message 1',
                    User: { username: 'user1' },
                    toJSON: function () { return this; }
                },
                {
                    id: 2,
                    content: 'Message 2',
                    User: { username: 'user2' },
                    toJSON: function () { return this; }
                }
            ];

            authorizationService.ensureUserInRoom.mockResolvedValue(true);
            messageRepository.findMessagesByRoom.mockResolvedValue(mockMessages);
            messageRepository.countMessagesByRoom.mockResolvedValue(50);

            // Act
            const result = await messageService.getMessages(userId, roomId, limit, offset);

            // Assert
            expect(result.messages).toHaveLength(2);
            expect(result.pagination.total).toBe(50);
            expect(result.pagination.hasMore).toBe(true);
            expect(result.messages[0].username).toBe('user1');
        });
    });

    describe('updateMessage', () => {
        test('should update message successfully', async () => {
            // Arrange
            const userId = 1;
            const messageId = 1;
            const content = 'Updated content';
            const mockMessage = {
                id: messageId,
                user_id: userId,
                room_id: 1,
                content
            };

            authorizationService.canUpdateMessage.mockResolvedValue(true);
            messageRepository.updateMessage.mockResolvedValue(mockMessage);
            socketService.broadcastMessageUpdate.mockReturnValue(undefined);

            // Act
            const result = await messageService.updateMessage(userId, messageId, content);

            // Assert
            expect(result).toEqual(mockMessage);
            expect(socketService.broadcastMessageUpdate).toHaveBeenCalledWith(1, mockMessage);
        });
    });

    describe('deleteMessage', () => {
        test('should delete message successfully', async () => {
            // Arrange
            const userId = 1;
            const messageId = 1;
            const roomId = 1;

            authorizationService.ensureUserInRoom.mockResolvedValue(true);
            authorizationService.canDeleteMessage.mockResolvedValue(true);
            messageRepository.deleteMessage.mockResolvedValue(undefined);
            socketService.broadcastMessageDeletion.mockReturnValue(undefined);

            // Act
            await messageService.deleteMessage(userId, messageId, roomId);

            // Assert
            expect(messageRepository.deleteMessage).toHaveBeenCalledWith(messageId);
            expect(socketService.broadcastMessageDeletion).toHaveBeenCalledWith(roomId, messageId);
        });
    });
});

describe('AuthorizationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('canDeleteMessage', () => {
        test('should allow message author to delete', async () => {
            // Arrange
            const userId = 1;
            const messageId = 1;
            const roomId = 1;
            const mockMessage = {
                id: messageId,
                user_id: userId,
                room_id: roomId
            };

            messageRepository.findMessageByIdAndRoom.mockResolvedValue(mockMessage);

            // Act
            const result = await authorizationService.canDeleteMessage(userId, messageId, roomId);

            // Assert
            expect(result).toBe(true);
        });

        test('should allow room creator to delete any message', async () => {
            // Arrange
            const userId = 1;
            const messageId = 1;
            const roomId = 1;
            const mockMessage = {
                id: messageId,
                user_id: 2, // Different user
                room_id: roomId
            };

            messageRepository.findMessageByIdAndRoom.mockResolvedValue(mockMessage);
            messageRepository.getRoomCreatorId.mockResolvedValue(userId);

            // Act
            const result = await authorizationService.canDeleteMessage(userId, messageId, roomId);

            // Assert
            expect(result).toBe(true);
        });

        test('should deny deletion for unauthorized user', async () => {
            // Arrange
            const userId = 3;
            const messageId = 1;
            const roomId = 1;
            const mockMessage = {
                id: messageId,
                user_id: 2, // Different user
                room_id: roomId
            };

            messageRepository.findMessageByIdAndRoom.mockResolvedValue(mockMessage);
            messageRepository.getRoomCreatorId.mockResolvedValue(1); // Different creator

            // Act & Assert
            await expect(
                authorizationService.canDeleteMessage(userId, messageId, roomId)
            ).rejects.toThrow('You are not authorized to delete this message');
        });
    });
});
