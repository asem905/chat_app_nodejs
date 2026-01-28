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


    broadcastTyping(roomId, userData, socketId) {
        if (!this.isInitialized()) {
            return;
        }
        console.log("broadcasting typing to room", roomId);
        // Broadcast to all users in the room EXCEPT the sender
        if (socketId) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                console.log("broadcasting typing to room", roomId);
                socket.to(roomId.toString()).emit('userTyping', userData);
            }
        } else {
            // Fallback: broadcast to everyone if socketId not provided
            this.io.to(roomId.toString()).emit('userTyping', userData);
        }
    }


    broadcastStopTyping(roomId, userData, socketId) {
        if (!this.isInitialized()) {
            return;
        }
        console.log("trying to broadcast stop typing to room", roomId);
        // Broadcast to all users in the room EXCEPT the sender
        if (socketId) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                console.log("broadcasting stop typing to room", roomId);
                socket.to(roomId.toString()).emit('userStoppedTyping', userData);
            }
        } else {
            // Fallback: broadcast to everyone if socketId not provided
            console.log("broadcasting stop typing to room", roomId);
            this.io.to(roomId.toString()).emit('userStoppedTyping', userData);
        }
    }
}

module.exports = new SocketService();
