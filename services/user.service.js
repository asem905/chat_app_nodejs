const userRepository = require("../repositories/user.repository");
const appError = require("../utils/app_error");
const { httpStatusText, httpStatusCodes } = require("../utils/http_status");
const bcrypt = require("bcrypt");
const generateJWT = require("../utils/genJWT");
const bloomFilterService = require("./bloom_filter.service");
const {
    validateUserRegistration,
    validateUserLogin,
    validateUserUpdate,
    validateUserId
} = require("../utils/validators/user.validator");

/**
 * User Service - Business Logic Layer
 * Handles user-related business operations
 */
class UserService {
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const validatedUserId = validateUserId(userId);
        const user = await userRepository.getUserById(validatedUserId);

        if (!user) {
            throw appError.createErrorResponse(
                "User not found",
                httpStatusCodes.NOT_FOUND,
                httpStatusText.FAIL
            );
        }

        return user;
    }

    /**
     * Get multiple users by IDs
     */
    async getUsersByIds(userIds) {
        if (!userIds || userIds.length === 0) {
            return [];
        }

        const users = await userRepository.getUsersByIds(userIds);
        return users;
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email) {
        const user = await userRepository.findUserByEmail(email);

        if (!user) {
            throw appError.createErrorResponse(
                "User not found",
                httpStatusCodes.NOT_FOUND,
                httpStatusText.FAIL
            );
        }

        return user;
    }

    /**
     * Get user by username
     */
    async getUserByUsername(username) {
        const user = await userRepository.findUserByUsername(username);

        if (!user) {
            throw appError.createErrorResponse(
                "User not found",
                httpStatusCodes.NOT_FOUND,
                httpStatusText.FAIL
            );
        }

        return user;
    }

    /**
     * Get all users
     */
    async getAllUsers() {
        const users = await userRepository.findAllUsers();

        if (!users || users.length === 0) {
            throw appError.createErrorResponse(
                "No users found",
                httpStatusCodes.NOT_FOUND,
                httpStatusText.FAIL
            );
        }

        return users;
    }

    /**
     * Register a new user
     */
    async registerUser(userData, avatarFilename = null) {
        // Validate registration data
        const validatedData = validateUserRegistration(userData);

        // OPTIMIZATION: Check Bloom Filter first (hashes email, checks bits)
        // If filter says "definitely not exists" -> skip DB query entirely
        const mightExist = bloomFilterService.mightExistEmail(validatedData.email);

        let existingUser = null;
        if (mightExist) {
            console.log("User might exist");
            existingUser = await userRepository.findUserByEmail(validatedData.email);
        }

        if (existingUser) {
            throw appError.createErrorResponse(
                "User with this email already exists",
                httpStatusCodes.BAD_REQUEST,
                httpStatusText.FAIL
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(validatedData.password, 10);
        if (!hashedPassword) {
            throw appError.createErrorResponse(
                "Password hashing failed",
                httpStatusCodes.INTERNAL_SERVER_ERROR,
                httpStatusText.ERROR
            );
        }

        // Prepare user data
        const userPayload = {
            username: validatedData.username,
            email: validatedData.email,
            password: hashedPassword,
            role: validatedData.role,
            avatar: avatarFilename || ""
        };

        // Create user
        const user = await userRepository.createUser(userPayload);

        if (!user) {
            throw appError.createErrorResponse(
                "User creation failed",
                httpStatusCodes.INTERNAL_SERVER_ERROR,
                httpStatusText.ERROR
            );
        }

        // Generate JWT token
        const token = generateJWT({
            id: user.id,
            email: user.email,
            role: user.role
        });

        // Update user with token
        await userRepository.updateUserToken(user.id, token);
        user.token = token;

        // OPTIMIZATION: Add email to Bloom Filter (hash email → set bits)
        // This hashes the email to get bit positions and sets those bits to 1
        // The actual email string is NOT stored in the filter
        bloomFilterService.addEmail(user.email);

        return user;
    }

    /**
     * Login user
     */
    async loginUser(loginData) {
        // Validate login data
        const validatedData = validateUserLogin(loginData);

        // OPTIMIZATION: Check Bloom Filter first (hashes email, checks bits)
        // If filter says "definitely not exists" -> skip DB query entirely
        const mightExist = bloomFilterService.mightExistEmail(validatedData.email);
        let existingUser = null;
        if (!mightExist) {
            console.log("User might not exist in bloom filter");
            throw appError.createErrorResponse(
                "Invalid email or password",
                httpStatusCodes.UNAUTHORIZED,
                httpStatusText.FAIL
            );
        }
        console.log("=======================");
        console.log("User might exist");
        console.log("=======================");
        // Find user by email
        const user = await userRepository.findUserByEmail(validatedData.email);
        if (!user) {
            throw appError.createErrorResponse(
                "Invalid email or password",
                httpStatusCodes.UNAUTHORIZED,
                httpStatusText.FAIL
            );
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
        if (!isPasswordValid) {
            throw appError.createErrorResponse(
                "Invalid email or password",
                httpStatusCodes.UNAUTHORIZED,
                httpStatusText.FAIL
            );
        }

        // Generate new JWT token
        const token = generateJWT({
            id: user.id,
            email: user.email,
            role: user.role
        });

        // Update user with new token
        await userRepository.updateUserToken(user.id, token);
        user.token = token;

        return user;
    }

    /**
     * Update user profile
     */
    async updateUserProfile(userId, updateData) {
        const validatedUserId = validateUserId(userId);
        const validatedData = validateUserUpdate(updateData);

        // Check if user exists
        const user = await this.getUserById(validatedUserId);

        // If email is being updated, check if it's already taken
        if (validatedData.email && validatedData.email !== user.email) {
            const existingUser = await userRepository.findUserByEmail(validatedData.email);
            if (existingUser) {
                throw appError.createErrorResponse(
                    "Email already in use",
                    httpStatusCodes.BAD_REQUEST,
                    httpStatusText.FAIL
                );
            }
        }

        // Update user
        const updatedUser = await userRepository.updateUser(validatedUserId, validatedData);

        return updatedUser;
    }

    /**
     * Validate user exists (helper method)
     */
    async validateUserExists(userId) {
        const user = await userRepository.getUserById(userId);
        return !!user;
    }

    /**
     * Get safe user data (exclude sensitive fields)
     */
    getSafeUserData(user) {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            status: user.status,
            role: user.role,
            token: user.token
        };
    }
}

module.exports = new UserService();

