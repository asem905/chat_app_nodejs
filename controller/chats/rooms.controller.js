const roomService = require("../../services/room.service");
const authorizationService = require("../../services/authorization.service");
const asyncWrapper = require("../../middlewares/async_wrapper");
const ResponseFormatter = require("../../utils/response.formatter");
const {
  validateRoomId,
  validateUserId,
  validateRoomData,
  validateRoomExists,
  validateUserInRoom
} = require("../../utils/validators/room_message.validator");
const { httpStatusCodes } = require("../../utils/http_status");
const { message } = require("../../utils/app_error");

/**
 * Create a new room
 */
const createRoom = asyncWrapper(async (req, res, next) => {
  const userId = req.currentUser.id;
  const { room_name, room_description, is_private } = req.body;

  validateUserId(userId);
  validateRoomData(room_name, room_description, is_private);

  const { room } = await roomService.createRoom(
    room_name,
    room_description,
    is_private,
    userId
  );

  return ResponseFormatter.created(res, {
    room: {
      id: room.id,
      room_name: room.room_name,
      room_description: room.room_description,
      is_private: room.is_private,
      createdAt: room.createdAt,
      room_created_by: userId,
    },
  }, "Room created successfully");
});

/**
 * Get all available rooms (not joined by user)
 */
const getAllRooms = asyncWrapper(async (req, res, next) => {
  const userId = req.currentUser.id;

  validateUserId(userId);

  const usersRooms = await roomService.getAllRooms(userId);

  return ResponseFormatter.success(res, httpStatusCodes.OK, {
    usersRooms,
  });
});

/**
 * Get room by ID
 */
const getRoomById = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId;
  const userId = req.currentUser.id;

  validateRoomId(roomId);
  validateUserId(userId);

  const { room, usersInRoom, owner } = await roomService.getRoomById(roomId, userId);

  validateRoomExists(room);
  validateUserInRoom(usersInRoom, userId);

  return ResponseFormatter.success(res, httpStatusCodes.OK, {
    room: {
      id: room.id,
      room_name: room.room_name,
      room_description: room.room_description,
      is_private: room.is_private,
      room_created_by: owner[0].username,
      usersInRoom,
    },
  });
});

/**
 * Get all rooms for current user
 */
const getRoomsForUser = asyncWrapper(async (req, res, next) => {
  const userId = req.currentUser.id;

  validateUserId(userId);

  const rooms = await roomService.getRoomsForUser(userId);
  validateRoomExists(rooms);

  return ResponseFormatter.success(res, httpStatusCodes.OK, {
    rooms,
  });
});

/**
 * Join a room
 */
const joinRoom = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId;
  const userId = req.currentUser.id;
  validateRoomId(roomId);
  validateUserId(userId);
  await roomService.joinRoom(roomId, userId);

  return ResponseFormatter.success(
    res,
    httpStatusCodes.OK,
    "Request to join room sent successfully"
  );
});

/**
 * Leave a room
 */
const leaveRoom = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId;
  const userId = req.currentUser.id;

  validateRoomId(roomId);
  validateUserId(userId);

  await roomService.leaveRoom(roomId, userId);

  return ResponseFormatter.success(
    res,
    httpStatusCodes.OK,
    "Room left successfully"
  );
});

/**
 * Approve user to join room (owner only)
 */
const approveUserToJoinRoom = asyncWrapper(async (req, res, next) => {
  const ownerId = req.currentUser.id;
  const roomId = req.params.roomId;
  const userId = req.params.userId;

  validateUserId(ownerId);
  validateRoomId(roomId);
  validateUserId(userId);
  await authorizationService.canApproveUser(ownerId, roomId);
  await roomService.approveUserToJoinRoom(roomId, ownerId, userId);

  return ResponseFormatter.success(
    res,
    httpStatusCodes.OK,
    "Approved successfully"
  );
});

/**
 * Get non-approved users for a room (owner only)
 */
const nonApprovedUsers = asyncWrapper(async (req, res, next) => {
  const currentUserId = req.currentUser.id;
  const roomId = req.params.roomId;

  validateUserId(currentUserId);
  validateRoomId(roomId);
  const users = await roomService.getNonApprovedUsersForRoom(roomId, currentUserId);
  return ResponseFormatter.success(res, httpStatusCodes.OK, {
    room_id: roomId,
    users,
  });
});

module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  getRoomsForUser,
  joinRoom,
  leaveRoom,
  approveUserToJoinRoom,
  nonApprovedUsers,
};
