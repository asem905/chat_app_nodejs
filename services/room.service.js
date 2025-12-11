const appError = require("../utils/app_error");
const { httpStatusText, httpStatusCodes } = require("../utils/http_status");
const roomRepository = require("../repositories/room.repository");
const userRepository = require("../repositories/user.repository");
const roomRules = require("../utils/room_rules");
const {
    validateUserId,
    validateRoomCreation,
    validateUserAuthorization
} = require("../utils/validators/room_message.validator");
class RoomService {
    async createRoom(room_name, room_description, is_private, room_created_by) {
        const user = await userRepository.getUserById(room_created_by);
        const room = await roomRepository.createRoom(room_name, room_description, is_private, room_created_by);
        validateRoomCreation(room);
        const userRoom = await roomRepository.createRoomForUser(room_created_by, room.id, roomRules.OWNER, true);
        validateRoomCreation(userRoom);
        return {
            room,
            userRoom
        }
    }
    async getRoomById(roomId, currentUserId) {
        const room = await roomRepository.findRoomById(roomId);
        validateRoomCreation(room);
        const usersInRoom = await room.getMembers();
        const owner = usersInRoom.filter((user) => user.id == room.room_created_by);
        const isOwner = owner[0].id == currentUserId;
        return {
            room,
            usersInRoom,
            owner,
            isOwner
        }
    }
    async getRoomsForUser(userId) {
        const rooms = await roomRepository.getRoomsApprovedForUser(userId);
        validateRoomCreation(rooms);
        return rooms;
    }
    async joinRoom(roomId, userId) {
        const room = await roomRepository.findRoomById(roomId);
        validateRoomCreation(room);
        const userRoom = await roomRepository.createRoomForUser(userId, roomId, roomRules.MEMBER, false);
        validateRoomCreation(userRoom);
        return {
            room,
            userRoom
        }
    }
    async leaveRoom(roomId, userId) {
        const room = await roomRepository.findRoomById(roomId);
        validateRoomCreation(room);
        const userRoom = await roomRepository.deleteRoomForUser(userId, roomId);
        validateRoomCreation(userRoom);
        return {
            room,
            userRoom
        }
    }
    async approveUserToJoinRoom(roomId, ownerId, userId) {
        const room = await roomRepository.findRoomById(roomId);
        validateRoomCreation(room);
        const ownerCheck = await roomRepository.checkRoomOwner(ownerId, roomId);
        validateUserId(ownerCheck.user_id);
        const nonApprovedUser = await roomRepository.checkNonApprovedUserForRoom(roomId, userId);
        validateUserId(nonApprovedUser.user_id);
        const userRoom = await roomRepository.approveRoomForUser(userId, roomId);
        validateRoomCreation(userRoom);
        return {
            room,
            userRoom
        }
    }
    async getNonApprovedUsersForRoom(roomId, ownerId) {
        const ownerCheck = await roomRepository.checkRoomOwner(ownerId, roomId);
        validateUserAuthorization(ownerCheck);
        const nonApprovedUsers = await roomRepository.getNonApprovedUsersForRoom(roomId);
        const userIds = nonApprovedUsers.map((userRoom) => userRoom.user_id);
        const users = await userRepository.getUsersByIds(userIds);
        return users;
    }
    async getAllRooms(userId) {
        const joinedRoomIds = await roomRepository.getRoomsApprovedForUser(userId);
        console.log("joinedRoomIds", joinedRoomIds);
        const joinedIds = joinedRoomIds.map((userRoom) => {
            console.log("userRoom", userRoom.id);
            return userRoom.id;
        });
        console.log("joinedIds", joinedIds);
        const rooms = await roomRepository.getAllAvailableRooms(userId, joinedIds);
        console.log("rooms", rooms.map((room) => room.room_name));
        const usersRooms = [];
        for (const room of rooms) {
            const users = await room.getMembers();
            const owner = users.filter((user) => user.id == room.room_created_by);
            usersRooms.push({
                room_id: room.id,
                room_name: room.room_name,
                room_description: room.room_description,
                is_private: room.is_private,
                room_created_by: room.room_created_by,
                room_owner: owner[0].username,
                createdAt: room.createdAt,
                members: room.is_private ? [] : users,
            });
        }
        return usersRooms;
    }
}
module.exports = new RoomService();