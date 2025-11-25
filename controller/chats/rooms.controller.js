const { User, Room, UserRoom } = require("../../models/relations/users_rooms_link");
const asyncWrapper = require("../../middlewares/async_wrapper");
const appError = require("../../utils/app_error");
const { httpStatusText, httpStatusCodes } = require("../../utils/http_status");
const roomRules=require("../../utils/room_rules");
const messagesController = require("./messages.controller");
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
  });
  return res.status(httpStatusCodes.CREATED).json({
    status: httpStatusText.SUCCESS,
    data: {
      room: {
        id: newRoom.id,
        room_name: newRoom.room_name,
        room_description: newRoom.room_description,
        is_private: newRoom.is_private,
        room_created_by: user.username,
      },
    },
  });
});

const getAllRooms = asyncWrapper(async (req, res, next) => {
  const rooms = await Room.findAll();
  if (!rooms || rooms.length === 0) {
    const error = appError.createErrorResponse(
      "Rooms not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.json({ ...error });
  } // FIX: Added 'return' for successful response termination
  return res.status(httpStatusCodes.OK).json({
    status: httpStatusText.SUCCESS,
    data: {
      rooms,
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
    return res.json({ ...error });
  }
  //creator
  const owner = usersInRoom.filter((user) => user.id == room.room_created_by);
  const userId=req.currentUser.id;
  if(!userId){
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.json({ ...error });
  }
  //check if user is in room
  if( usersInRoom.filter((user) => user.id == userId).length === 0){
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.json({ ...error });
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
  if (!userId) {
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.json({ ...error });
  }
  const user=await User.findOne({where:{id:userId}});
  const rooms=await user.getRooms();
  
  if (!rooms || rooms.length === 0) {
    const error = appError.createErrorResponse(
      "Rooms not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.json({ ...error });
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
    return res.json({ ...error });
  }
  const userId = req.currentUser.id;
  if (!userId) {
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.json({ ...error });
  }
  console.log(roomId, userId);
  const userRoom = await UserRoom.create({
    user_id: userId,
    room_id: roomId,
    room_role: roomRules.MEMBER,
  });
  userRoom.save();
  return res.status(httpStatusCodes.OK).json({
    status: httpStatusText.SUCCESS,
    data: "Room joined successfully",
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
    return res.json({ ...error });
  }
  const userId = req.currentUser.id;
  if (!userId) {
    const error = appError.createErrorResponse(
      "User not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.json({ ...error });
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
    return res.json({ ...error });
  }
  // if (userRoom.room_role == roomRules.OWNER) {
  //   const room = await Room.findOne({ where: { id: roomId } });
  //   if (!room) {
  //     const error = appError.createErrorResponse(
  //       "Room not found",
  //       httpStatusCodes.NOT_FOUND,
  //       httpStatusText.FAIL
  //     );
  //     return res.json({ ...error });
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
module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  getRoomsForUser,
  joinRoom,
  leaveRoom,
};
