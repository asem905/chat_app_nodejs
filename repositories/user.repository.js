const { User } = require("../models/relations/users_rooms_link");

/**
 * User Repository - Data Access Layer
 * Handles all database operations for User entity
 */
class UserRepository {
    /**
     * Find user by primary key (ID)
     */
    async getUserById(id) {
        return await User.findByPk(id);
    }

    /**
     * Find multiple users by their IDs
     */
    async getUsersByIds(ids) {
        return await User.findAll({ where: { id: ids } });
    }

    /**
     * Find user by email address
     */
    async findUserByEmail(email) {
        return await User.findOne({
            where: { email }
        });
    }

    /**
     * Find user by username
     */
    async findUserByUsername(username) {
        return await User.findOne({
            where: { username }
        });
    }

    /**
     * Create a new user
     */
    async createUser(userData) {
        const { username, email, password, role, avatar } = userData;

        const userPayload = {
            username,
            email,
            password,
            role,
            token: null
        };

        if (avatar) {
            userPayload.avatar = avatar;
        }

        return await User.create(userPayload);
    }

    /**
     * Update user token
     */
    async updateUserToken(userId, token) {
        const user = await this.getUserById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        user.token = token;
        await user.save();

        return user;
    }

    /**
     * Update user profile information
     */
    async updateUser(userId, updateData) {
        const user = await this.getUserById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        // Update allowed fields
        if (updateData.username) user.username = updateData.username;
        if (updateData.email) user.email = updateData.email;
        if (updateData.avatar) user.avatar = updateData.avatar;
        if (updateData.status !== undefined) user.status = updateData.status;

        await user.save();

        return user;
    }

    /**
     * Get all users with optional exclusions
     */
    async findAllUsers(excludeFields = ['password', 'token']) {
        return await User.findAll({
            attributes: { exclude: excludeFields }
        });
    }

    /**
     * Check if user exists by email
     */
    async userExistsByEmail(email) {
        const user = await this.findUserByEmail(email);
        return !!user;
    }

    /**
     * Check if user exists by username
     */
    async userExistsByUsername(username) {
        const user = await this.findUserByUsername(username);
        return !!user;
    }

    /**
     * Get all emails for Bloom Filter initialization
     * Returns only emails (not usernames, not full user objects)
     */
    async getAllEmails() {
        const users = await User.findAll({
            attributes: ['email']
        });

        return users.map(user => user.email).filter(email => email);
    }
}

module.exports = new UserRepository(); 
