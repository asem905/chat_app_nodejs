const { sequelize, DataTypes } = require("../../configs/db.config");

const MessageReadBy = sequelize.define("MessageReadBy", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  message_id: {
    type: DataTypes.INTEGER,
    require: true,
    references: {
      model: "Message",
      key: "id",
    },
  },
  user_id: {
    type: DataTypes.INTEGER,
    require: true,
    references: {
      model: "User",
      key: "id",
    },
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});
module.exports = {
  MessageReadBy,
};
