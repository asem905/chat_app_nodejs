const { sequelize, DataTypes } = require("../../configs/db.config");
const Room = sequelize.define("Room", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  room_name: { type: DataTypes.STRING, require: true },
  room_description: { type: DataTypes.STRING, require: false },
  is_private: { type: DataTypes.BOOLEAN, require: true },
  room_created_by: {
    type: DataTypes.INTEGER,
    require: true,
  },
});
module.exports = Room;