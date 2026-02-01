const Message = require("../models/chats/messages.model");
const {
    User,
    Room,
    UserRoom,
} = require("../models/relations/users_rooms_link");

class MessageRepository {
    async findMessagesByRoom(roomId) {
        const messages = await Message.findAll({
            where: { room_id: roomId },
            order: [['created_at', 'ASC']],
        });

        return messages;
    }

    async countMessagesByRoom(roomId) {
        return await Message.count({
            where: { room_id: roomId }
        });
    }

    async createMessage(messageData) {
        const { user_id, content, room_id, parent_message_id = null } = messageData;

        return await Message.create({
            user_id,
            content,
            room_id,
            parent_message_id
        });
    }


    async findMessageById(messageId) {
        return await Message.findOne({
            where: { id: messageId }
        });
    }


    async findMessageByIdAndRoom(messageId, roomId) {
        return await Message.findOne({
            where: { id: messageId, room_id: roomId }
        });
    }


    async updateMessage(messageId, content) {
        const message = await this.findMessageById(messageId);

        if (!message) {
            throw new Error("Message not found");
        }

        message.content = content;
        message.edited_at = new Date();
        await message.save();

        return message;
    }


    async deleteMessage(messageId) {
        const message = await this.findMessageById(messageId);

        if (!message) {
            throw new Error("Message not found");
        }

        await message.destroy();
    }


    async isUserInRoom(userId, roomId) {
        const userRoom = await UserRoom.findOne({
            where: { user_id: userId, room_id: roomId }
        });
        return userRoom;
    }


    async getRoomCreatorId(roomId) {
        const room = await Room.findOne({
            where: { id: roomId },
            attributes: ['room_created_by']
        });

        return room ? room.room_created_by : null;
    }

    /**
     * Bulk create multiple messages in a single transaction
     * @param {Array} messagesArray - Array of message objects
     * @returns {Array} Created messages
     */
    async bulkCreateMessages(messagesArray) {
        const { sequelize } = require('../configs/db.config');
        const transaction = await sequelize.transaction();

        try {
            // Bulk insert with transaction for atomicity
            const createdMessages = await Message.bulkCreate(
                messagesArray,
                {
                    transaction,
                    returning: true,  // Return created records
                    validate: true    // Run validations
                }
            );

            await transaction.commit();
            console.log(`[MessageRepository] ✅ Bulk created ${createdMessages.length} messages`);
            return createdMessages;

        } catch (error) {
            await transaction.rollback();
            console.error('[MessageRepository] ❌ Bulk create failed, transaction rolled back:', error.message);
            throw error;
        }
    }

}

module.exports = new MessageRepository();
