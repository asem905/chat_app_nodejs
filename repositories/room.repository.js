const {
    User,
    Room,
    UserRoom,
} = require("../models/relations/users_rooms_link");
const roomRules = require("../utils/room_rules");
const { Op } = require("sequelize");
class RoomRepository {
    async createRoom(room_name, room_description, is_private, room_created_by) {
        return await Room.create({
            room_name,
            room_description,
            is_private,
            room_created_by
        });
    }
    async createRoomForUser(user_id, room_id, room_role, is_approved) {
        return await UserRoom.create({
            user_id: user_id,
            room_id: room_id,
            room_role: room_role,
            is_approved: is_approved,
        });
    }
    async getRoomsApprovedForUser(userId) {
        const userRooms = await UserRoom.findAll({
            where: { user_id: userId, is_approved: true },
        });
        const roomIds = userRooms.map((userRoom) => userRoom.room_id);
        return await Room.findAll({
            where: { id: roomIds },
        });
    }
    async getRoomsEvenNotApproved(userId) {
        const userRooms = await UserRoom.findAll({
            where: { user_id: userId },
        });
        const roomIds = userRooms.map((userRoom) => userRoom.room_id);
        return await Room.findAll({
            where: { id: roomIds },
        });
    }
    async findRoomById(roomId) {
        return await Room.findOne({
            where: { id: roomId },
        });
    }
    async findRoomForUser(userId, roomId) {
        return await UserRoom.findOne({
            where: { user_id: userId, room_id: roomId },
        });
    }
    async deleteRoomForUser(userId, roomId) {
        return await UserRoom.destroy({
            where: { user_id: userId, room_id: roomId }
        });
    }
    async approveRoomForUser(userId, roomId) {
        return await UserRoom.update({ is_approved: true }, {
            where: { user_id: userId, room_id: roomId, is_approved: false }
        });
    }
    async checkRoomOwner(userId, roomId) {
        return await UserRoom.findOne({
            where: { user_id: userId, room_id: roomId, room_role: roomRules.OWNER },
        });
    }
    async updateRoomOwner(userId, roomId) {
        return await UserRoom.update({ room_role: roomRules.OWNER }, {
            where: { user_id: userId, room_id: roomId }
        });
    }
    async updateRoomMember(userId, roomId) {
        return await UserRoom.update({ room_role: roomRules.MEMBER }, {
            where: { user_id: userId, room_id: roomId }
        });
    }
    async getNonApprovedUsersForRoom(roomId) {
        return await UserRoom.findAll({
            where: { room_id: roomId, is_approved: false },
        });
    }
    async checkNonApprovedUserForRoom(roomId, userId) {
        return await UserRoom.findOne({
            where: { room_id: roomId, user_id: userId, is_approved: false },
        });
    }
    async getAllAvailableRooms(userId, joinedRoomIds) {
        return await Room.findAll({
            where: {
                room_created_by: { [Op.ne]: userId },
                id: { [Op.notIn]: joinedRoomIds.length > 0 ? joinedRoomIds : [-1] },
            },
        });
    }
    async getRoomsForUser(userId) {
        const userRooms = await UserRoom.findAll({
            where: { user_id: userId, is_approved: true },
        });
        const roomIds = userRooms.map((userRoom) => userRoom.room_id);
        return await Room.findAll({
            where: { id: roomIds },
        });
    }

    /**
     * Get user-room approval status
     * Used for Socket.IO access control
     */
    async getUserRoomApprovalStatus(userId, roomId) {
        return await UserRoom.findOne({
            where: { user_id: userId, room_id: roomId },
        });
    }

    /**
     * Find all rooms for a user (including unapproved)
     * Used for Socket.IO access control
     */
    async findRoomsByUserId(userId) {
        return await UserRoom.findAll({
            where: { user_id: userId },
            include: [{
                model: Room,
                as: 'Room',
            }],
        });
    }
}

module.exports = new RoomRepository();