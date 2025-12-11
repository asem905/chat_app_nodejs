const { sequelize, DataTypes } = require("../../configs/db.config");
const roomRules = require("../../utils/room_rules")
// Define the junction model
const UserRoom = sequelize.define('UserRoom', {
    room_role: {
        type: DataTypes.STRING,
        values: [roomRules.OWNER, roomRules.MODERATOR, roomRules.MEMBER],
        defaultValue: 'member',
        allowNull: false
    },
    joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    is_approved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    }
});


module.exports = UserRoom;