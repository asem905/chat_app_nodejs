const appError = require("../app_error");
const { httpStatusText, httpStatusCodes } = require("../http_status");

/**
 * User Validators
 * Validation functions for user-related operations
 */

/**
 * Validate user ID
 */
const validateUserId = (userId) => {
    if (!userId) {
        throw appError.createErrorResponse(
            "User ID is required",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    const parsedId = parseInt(userId);
    if (isNaN(parsedId) || parsedId <= 0) {
        throw appError.createErrorResponse(
            "Invalid user ID format",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    return parsedId;
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
    if (!email || typeof email !== 'string') {
        throw appError.createErrorResponse(
            "Email is required",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw appError.createErrorResponse(
            "Invalid email format",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    return email.toLowerCase().trim();
};

/**
 * Validate username
 */
const validateUsername = (username) => {
    if (!username || typeof username !== 'string') {
        throw appError.createErrorResponse(
            "Username is required",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3) {
        throw appError.createErrorResponse(
            "Username must be at least 3 characters long",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    if (trimmedUsername.length > 50) {
        throw appError.createErrorResponse(
            "Username must not exceed 50 characters",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    return trimmedUsername;
};

/**
 * Validate password
 */
const validatePassword = (password) => {
    if (!password || typeof password !== 'string') {
        throw appError.createErrorResponse(
            "Password is required",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    if (password.length < 6) {
        throw appError.createErrorResponse(
            "Password must be at least 6 characters long",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    return password;
};

/**
 * Validate user registration data
 */
const validateUserRegistration = (userData) => {
    const { username, email, password, role } = userData;

    const validatedData = {
        username: validateUsername(username),
        email: validateEmail(email),
        password: validatePassword(password),
        role: role || 'user' // Default role
    };

    return validatedData;
};

/**
 * Validate user login data
 */
const validateUserLogin = (loginData) => {
    const { email, password } = loginData;

    if (!email || !password) {
        throw appError.createErrorResponse(
            "Email and password are required",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    return {
        email: validateEmail(email),
        password: password // Don't validate password format on login
    };
};

/**
 * Validate user update data
 */
const validateUserUpdate = (updateData) => {
    const validatedData = {};

    if (updateData.username !== undefined) {
        validatedData.username = validateUsername(updateData.username);
    }

    if (updateData.email !== undefined) {
        validatedData.email = validateEmail(updateData.email);
    }

    if (updateData.status !== undefined) {
        validatedData.status = updateData.status;
    }

    if (updateData.avatar !== undefined) {
        validatedData.avatar = updateData.avatar;
    }

    if (Object.keys(validatedData).length === 0) {
        throw appError.createErrorResponse(
            "No valid fields to update",
            httpStatusCodes.BAD_REQUEST,
            httpStatusText.FAIL
        );
    }

    return validatedData;
};

module.exports = {
    validateUserId,
    validateEmail,
    validateUsername,
    validatePassword,
    validateUserRegistration,
    validateUserLogin,
    validateUserUpdate
};
