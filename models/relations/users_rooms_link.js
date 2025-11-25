const { sequelize, DataTypes } = require('../../configs/db.config');
const User = require('../user/users.model');
const Room = require('../chats/rooms.model');
const UserRoom = require('../user/user_room.model'); // Import the new junction model


User.belongsToMany(Room,{
    through: UserRoom,
    foreignKey: 'user_id', // The key added to the UserRoom table that references the User ID
    as: 'Rooms'          // Alias to access the relationship: user.getRooms()
})
Room.belongsToMany(User, {
    through: UserRoom,
    foreignKey: 'room_id', // The key added to the UserRoom table that references the Room ID
    as: 'Members'        // Alias to access the relationship: room.getMembers()
});

module.exports = {
    User,
    Room,
    UserRoom,
};