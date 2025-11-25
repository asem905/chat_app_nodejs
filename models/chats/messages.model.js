const { sequelize, DataTypes } = require("../../configs/db.config");
const Message = sequelize.define("Message", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  room_id: {
    type: DataTypes.INTEGER,
    require: true,
    references: {
      model: "Rooms",  // Changed to plural
      key: "id",
    },
  },
  user_id: {
    type: DataTypes.INTEGER,
    require: true,
    references: {
      model: "Users",  // Changed to plural
      key: "id",
    },
  },
  content: {
    type: DataTypes.STRING,
    require: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  edited_at: { type: DataTypes.DATE },
  deleted_at: { type: DataTypes.DATE },
  parent_message_id: {
    type: DataTypes.INTEGER,
    references: { model: "Messages", key: "id" },  // Changed to plural
  },
});
module.exports = Message;