const {
  User,
  Room,
  UserRoom,
} = require("../../models/relations/users_rooms_link");
const asyncWrapper = require("../../middlewares/async_wrapper");
const appError = require("../../utils/app_error");
const { httpStatusText, httpStatusCodes } = require("../../utils/http_status");
const roomRules = require("../../utils/room_rules");
const messagesController = require("./messages.controller");
const { Op } = require("sequelize");
const { array } = require("../../configs/multer.config");
const createRoom = asyncWrapper(async (req, res, next) => {
  const userId = req.currentUser.id;
  const user = await User.findOne({ where: { id: userId } });
  const { room_name, room_description, is_private } = req.body; // This basic check is redundant if you use the validation middleware properly // if (!room_name || !room_description || !is_private || !room_created_by) { //   const error = appError.createErrorResponse( //     "All fields are required", //     httpStatusCodes.BAD_REQUEST, //     httpStatusText.FAIL //   ); //   return next(error); // }
  const newRoom = await Room.create({
    room_name,
    room_description,
    is_private,
    room_created_by: userId,
  }); // Sequelize's 'create' function automatically saves the instance. 'newRoom.save()' is usually redundant. // newRoom.save(); // FIX: Added 'return' for successful response termination

  await UserRoom.create({
    user_id: userId,
    room_id: newRoom.id,
    room_role: roomRules.OWNER,
    is_approved: true,
  });
  return res.status(httpStatusCodes.CREATED).json({
    status: httpStatusText.SUCCESS,
    data: {
      room: {
        id: newRoom.id,
        room_name: newRoom.room_name,
        room_description: newRoom.room_description,
        is_private: newRoom.is_private,
        createdAt: newRoom.createdAt,
        room_created_by: user.id,
      },
    },
  });
});

const getAllRooms = asyncWrapper(async (req, res, next) => {
  const userId = req.currentUser.id;
  const joinedRoomIds = await UserRoom.findAll({
    attributes: ["room_id"],
    where: { user_id: userId, is_approved: true },
    raw: true,
  }).then((rows) => rows.map((r) => r.room_id));
  const rooms = await Room.findAll({
    where: {
      room_created_by: { [Op.ne]: userId },
      id: { [Op.notIn]: joinedRoomIds.length > 0 ? joinedRoomIds : [-1] },
    },
  });
  console.log(rooms);
  usersRooms = [];

  for (room of rooms) {
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
  return res.status(httpStatusCodes.OK).json({
    status: httpStatusText.SUCCESS,
    data: {
      usersRooms,
    },
  });
});
const getRoomById = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId;
  const room = await Room.findOne({ where: { id: roomId } });
  const usersInRoom = await room.getMembers();
  if (!room || room.length === 0 || !usersInRoom || usersInRoom.length === 0) {
    const error = appError.createErrorResponse(
      "Room not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  //creator
  const owner = usersInRoom.filter((user) => user.id == room.room_created_by);
  const userId = req.currentUser.id;
  if (!userId) {
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  //check if user is in room
  if (usersInRoom.filter((user) => user.id == userId).length === 0) {
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  // FIX: Added 'return' for successful response termination
  return res.status(httpStatusCodes.OK).json({
    status: httpStatusText.SUCCESS,
    data: {
      room: {
        id: room.id,
        room_name: room.room_name,
        room_description: room.room_description,
        is_private: room.is_private,
        room_created_by: owner[0].username,
        usersInRoom,
      },
    },
  });
});
const getRoomsForUser = asyncWrapper(async (req, res, next) => {
  //we get user id from token
  const userId = req.currentUser.id;
  console.log(userId);
  if (!userId) {
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  const roomsToCertainUser = await UserRoom.findAll({
    where: { user_id: userId, is_approved: true },
  });
  const rooms = await Room.findAll({
    where: { id: roomsToCertainUser.map((room) => room.room_id) },
  });

  if (!rooms || rooms.length === 0) {
    const error = appError.createErrorResponse(
      "Rooms not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  } // FIX: Added 'return' for successful response termination
  return res.status(httpStatusCodes.OK).json({
    status: httpStatusText.SUCCESS,
    data: {
      rooms,
    },
  });
});

const joinRoom = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId;
  if (!roomId) {
    const error = appError.createErrorResponse(
      "Room not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  const userId = req.currentUser.id;
  if (!userId) {
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  console.log("joinRoom", roomId, userId);
  const userRoom = await UserRoom.create({
    user_id: userId,
    room_id: roomId,
    room_role: roomRules.MEMBER,
  });
  userRoom.save();
  return res.status(httpStatusCodes.OK).json({
    status: httpStatusText.SUCCESS,
    data: "Request to join room sent successfully",
  });
});

const leaveRoom = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId;
  if (!roomId) {
    const error = appError.createErrorResponse(
      "Room not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  const userId = req.currentUser.id;
  if (!userId) {
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  const userRoom = await UserRoom.findOne({
    where: { user_id: userId, room_id: roomId },
  });
  if (!userRoom) {
    const error = appError.createErrorResponse(
      "Room not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  // if (userRoom.room_role == roomRules.OWNER) {
  //   const room = await Room.findOne({ where: { id: roomId } });
  //   if (!room) {
  //     const error = appError.createErrorResponse(
  //       "Room not found",
  //       httpStatusCodes.NOT_FOUND,
  //       httpStatusText.FAIL
  //     );
  //     return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  //   }
  //   await userRoom.destroy();
  //   await room.destroy();
  // } else {
  //   await userRoom.destroy();
  // }
  await userRoom.destroy();
  return res.status(httpStatusCodes.OK).json({
    status: httpStatusText.SUCCESS,
    data: "Room left successfully",
  });
});

const approveUserToJoinRoom = asyncWrapper(async (req, res, next) => {
  const ownerId = req.currentUser.id;
  console.log(ownerId);
  if (!ownerId) {
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  const roomId = req.params.roomId;
  console.log(roomId);
  const userId = req.params.userId;
  console.log(userId);
  const ownerRoom = await UserRoom.findOne({
    where: { user_id: ownerId, room_id: roomId },
  });
  if (!ownerRoom.room_role == roomRules.OWNER) {
    const error = appError.createErrorResponse(
      "You are not the owner of this room to approve users",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  const userRoom = await UserRoom.findOne({
    where: { user_id: userId, room_id: roomId, is_approved: false },
  });
  if (!userRoom) {
    const error = appError.createErrorResponse(
      "Room not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  await userRoom.update({ room_role: roomRules.MEMBER, is_approved: true });
  return res.status(httpStatusCodes.OK).json({
    status: httpStatusText.SUCCESS,
    data: "Approved successfully",
  });
});

const nonApprovedUsers = asyncWrapper(async (req, res, next) => {
  const currentUserId = req.currentUser.id;
  console.log(currentUserId);
  const roomId = req.params.roomId;
  const currentUser = await UserRoom.findOne({
    where: { user_id: currentUserId, room_id: roomId },
  });
  if (!currentUser.room_role == roomRules.OWNER) {
    const error = appError.createErrorResponse(
      "User not authorized",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  const usersRooms = await UserRoom.findAll({
    where: { room_id: roomId, is_approved: false },
  });
  const usersIds = usersRooms.map((userRoom) => userRoom.user_id);
  const users = await User.findAll({ where: { id: usersIds } });
  if (!users) {
    const error = appError.createErrorResponse(
      "Room not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.status(httpStatusCodes.NOT_FOUND).json({ ...error });
  }
  return res.status(httpStatusCodes.OK).json({
    status: httpStatusText.SUCCESS,
    data: {
      room_id: roomId,
      users,
    },
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
