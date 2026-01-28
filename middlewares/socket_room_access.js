const roomRepository = require('../repositories/room.repository');
const messageRepository = require('../repositories/message.repository');
const appError = require('../utils/app_error');
const { httpStatusText, httpStatusCodes } = require('../utils/http_status');

/**
 * Socket.IO Room Access Control Middleware
 * Ensures users can only access rooms they're authorized to join
 */

class SocketRoomAccessControl {

    /**
     * Check if user is a member of the room and approved (for private rooms)
     * @param {number} userId - User ID
     * @param {number} roomId - Room ID
     * @returns {Promise<{allowed: boolean, message: string, room: object}>}
     */
    async canJoinRoom(userId, roomId) {
        try {
            // 1. Check if room exists
            const room = await roomRepository.findRoomById(roomId);

            if (!room) {
                return {
                    allowed: false,
                    message: 'Room not found',
                    errorType: 'not_found'
                };
            }

            // 2. Check if user is already a member
            const userInRoom = await messageRepository.isUserInRoom(userId, roomId);

            if (!userInRoom) {
                return {
                    allowed: false,
                    message: 'You are not a member of this room',
                    errorType: 'not_member',
                    room
                };
            }

            // 3. For private rooms, check approval status
            if (room.is_private) {
                const isApproved = await this.isUserApprovedForRoom(userId, roomId);

                if (!isApproved) {
                    return {
                        allowed: false,
                        message: 'Your access to this private room is pending approval',
                        errorType: 'not_approved',
                        room
                    };
                }
            }

            // All checks passed
            return {
                allowed: true,
                message: 'Access granted',
                room
            };

        } catch (error) {
            console.error('[Socket Room Access] Error checking room access:', error);
            return {
                allowed: false,
                message: 'Error verifying room access',
                errorType: 'server_error'
            };
        }
    }

    /**
     * Check if user is approved for a private room
     * @param {number} userId 
     * @param {number} roomId 
     * @returns {Promise<boolean>}
     */
    async isUserApprovedForRoom(userId, roomId) {
        try {
            const approval = await roomRepository.getUserRoomApprovalStatus(userId, roomId);
            return approval && approval.is_approved === true;
        } catch (error) {
            console.error('[Socket Room Access] Error checking approval status:', error);
            return false;
        }
    }

    /**
     * Check if user can send messages in a room
     * @param {number} userId 
     * @param {number} roomId 
     * @returns {Promise<{allowed: boolean, message: string}>}
     */
    async canSendMessage(userId, roomId) {
        // Reuse the same logic as joining - if you can join, you can send messages
        return await this.canJoinRoom(userId, roomId);
    }

    /**
     * Verify room membership for Socket.IO events (typing, etc.)
     * @param {number} userId 
     * @param {number} roomId 
     * @returns {Promise<boolean>}
     */
    async verifyRoomMembership(userId, roomId) {
        try {
            const result = await this.canJoinRoom(userId, roomId);
            return result.allowed;
        } catch (error) {
            console.error('[Socket Room Access] Error verifying membership:', error);
            return false;
        }
    }

    /**
     * Get all rooms a user has access to
     * @param {number} userId 
     * @returns {Promise<Array>}
     */
    async getUserAccessibleRooms(userId) {
        try {
            // Get all user rooms from repository
            const userRooms = await roomRepository.findRoomsByUserId(userId);

            // Filter to only include approved rooms
            const accessibleRooms = [];

            for (const userRoom of userRooms) {
                if (!userRoom.Room.is_private || userRoom.is_approved) {
                    accessibleRooms.push({
                        id: userRoom.Room.id,
                        name: userRoom.Room.room_name,
                        isPrivate: userRoom.Room.is_private,
                        isApproved: userRoom.is_approved
                    });
                }
            }

            return accessibleRooms;
        } catch (error) {
            console.error('[Socket Room Access] Error getting accessible rooms:', error);
            return [];
        }
    }

    /**
     * Check if user is room owner
     * @param {number} userId 
     * @param {number} roomId 
     * @returns {Promise<boolean>}
     */
    async isRoomOwner(userId, roomId) {
        try {
            const ownerCheck = await roomRepository.checkRoomOwner(userId, roomId);
            return ownerCheck === true;
        } catch (error) {
            console.error('[Socket Room Access] Error checking room ownership:', error);
            return false;
        }
    }
}

// Create singleton instance
const socketRoomAccessControl = new SocketRoomAccessControl();

module.exports = socketRoomAccessControl;
