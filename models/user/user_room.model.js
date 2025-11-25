const { sequelize, DataTypes } = require("../../configs/db.config");
const roomRules=require("../../utils/room_rules")
// Define the junction model
const UserRoom = sequelize.define('UserRoom', {
    // Add specific attributes for the membership here. 
    // The foreign keys (UserId, RoomId) are added automatically by Sequelize associations.
    
    // Example: Defining the user's role specifically within this room
    room_role: {
        type: DataTypes.STRING,
        values: [roomRules.OWNER,roomRules.MODERATOR,roomRules.MEMBER],
        defaultValue: 'member',
        allowNull: false
    },
    
    // Example: When the user joined the room
    joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    }
});

module.exports = UserRoom;