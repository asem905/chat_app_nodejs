const userRepository = require("../repositories/user.repository");
const appError = require("../utils/app_error");
const { httpStatusText, httpStatusCodes } = require("../utils/http_status");

/**
 * User Service - Business Logic Layer
 * Handles user-related business operations
 */
class UserService {
    async getUserById(userId) {
        const user = await userRepository.getUserById(userId);

        if (!user) {
            throw appError.createErrorResponse(
                "User not found",
                httpStatusCodes.NOT_FOUND,
                httpStatusText.FAIL
            );
        }

        return user;
    }

    async getUsersByIds(userIds) {
        if (!userIds || userIds.length === 0) {
            return [];
        }

        const users = await userRepository.getUsersByIds(userIds);
        return users;
    }
}

module.exports = new UserService();
