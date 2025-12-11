/**
 * Socket Service for handling real-time message broadcasting
 * Separates Socket.IO logic from business logic
 */
class SocketService {
    constructor() {
        this.io = null;
    }


    setIo(io) {
        this.io = io;
        console.log('[SocketService] Socket.IO instance initialized');
    }


    getIo() {
        return this.io;
    }


    isInitialized() {
        return this.io !== null;
    }


    broadcastNewMessage(roomId, message) {
        if (!this.isInitialized()) {
            console.warn('[SocketService] Socket.IO not initialized. Message not broadcast.');
            return;
        }

        this.io.to(roomId.toString()).emit('newMessage', message);
        console.log(`[SocketService] New message broadcast to room ${roomId}:`, message.id);
    }


    broadcastMessageUpdate(roomId, message) {
        if (!this.isInitialized()) {
            console.warn('[SocketService] Socket.IO not initialized. Update not broadcast.');
            return;
        }

        this.io.to(roomId.toString()).emit('messageUpdated', message);
        console.log(`[SocketService] Message update broadcast to room ${roomId}:`, message.id);
    }


    broadcastMessageDeletion(roomId, messageId) {
        if (!this.isInitialized()) {
            console.warn('[SocketService] Socket.IO not initialized. Deletion not broadcast.');
            return;
        }

        this.io.to(roomId.toString()).emit('messageDeleted', { messageId });
        console.log(`[SocketService] Message deletion broadcast to room ${roomId}:`, messageId);
    }


    broadcastTyping(roomId, userData) {
        if (!this.isInitialized()) {
            return;
        }

        this.io.to(roomId.toString()).emit('userTyping', userData);
    }


    broadcastStopTyping(roomId, userData) {
        if (!this.isInitialized()) {
            return;
        }

        this.io.to(roomId.toString()).emit('userStoppedTyping', userData);
    }
}

module.exports = new SocketService();
