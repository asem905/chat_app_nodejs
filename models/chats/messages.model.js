const { sequelize, DataTypes } = require("../../configs/db.config");

/**
 * Message Model
 * Represents chat messages in the system
 */
const Message = sequelize.define("Message", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    room_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Rooms",
            key: "id",
        },
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id",
        },
    },
    content: {
        type: DataTypes.TEXT, // Changed from STRING to TEXT for longer messages
        allowNull: false,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    edited_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    parent_message_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "Messages",
            key: "id",
        },
    },
}, {
    tableName: 'Messages',
    timestamps: false,
    indexes: [
        {
            fields: ['room_id', 'created_at']
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['parent_message_id']
        }
    ]
});

Message.associate = (models) => {
    Message.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'User'
    });

    Message.belongsTo(models.Room, {
        foreignKey: 'room_id',
        as: 'Room'
    });
    Message.belongsTo(Message, {
        foreignKey: 'parent_message_id',
        as: 'ParentMessage'
    });
    Message.hasMany(Message, {
        foreignKey: 'parent_message_id',
        as: 'Replies'
    });
};

module.exports = Message;
