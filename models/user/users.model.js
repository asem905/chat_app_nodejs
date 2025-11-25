const { sequelize, DataTypes } = require("../../configs/db.config");
const userRoles = require("../../utils/user_roles");
const userStatus = require("../../utils/user_status");
const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: { type: DataTypes.STRING, require: true },
  email: {
    type: DataTypes.STRING,
    require: true,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    require: true,
  },
  avatar: {
    type: DataTypes.STRING,
    defaultValue: "profile.png",
  },
  status: {
    type: DataTypes.STRING,
    values: [userStatus.ONLINE, userStatus.BUSY, userStatus.OFFLINE],
    defaultValue: "online",
  },
  token: {
    type: DataTypes.STRING,
    require: true,
  },
  role: {
    type: DataTypes.STRING,
    values: [userRoles.user, userRoles.admin],
    validate: {
      isIn: {
        args: [[userRoles.user, userRoles.admin]],
        msg: "Role must be either 'user' or 'admin'.",
      },
    },
    defaultValue: "user",
  },
  last_seen: {
    type: DataTypes.DATE,
    require: false,
    defaultValue: DataTypes.NOW,
  },
});
module.exports = User;
