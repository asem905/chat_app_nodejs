const userService = require("../../services/user.service");
const asyncWrapper = require("../../middlewares/async_wrapper");
const ResponseFormatter = require("../../utils/response.formatter");
const { httpStatusCodes } = require("../../utils/http_status");
const { validationResult } = require("express-validator");
const appError = require("../../utils/app_error");
const { httpStatusText } = require("../../utils/http_status");

/**
 * User Controller - HTTP Request Handler Layer
 * Handles HTTP requests and delegates business logic to user service
 */

/**
 * Register a new user
 */
const registerUser = asyncWrapper(async (req, res, next) => {
  // Validate request body using express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationError = appError.createErrorResponse(
      "Validation Error",
      httpStatusCodes.BAD_REQUEST,
      httpStatusText.FAIL,
      errors.array()
    );
    return next(validationError);
  }

  // Extract avatar filename from multer
  const avatarFilename = req.file ? req.file.filename : null;

  // Extract user data from request body
  const userData = {
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role
  };

  // Delegate to service layer
  const user = await userService.registerUser(userData, avatarFilename);

  // Get safe user data
  const safeUserData = userService.getSafeUserData(user);

  // Return response
  return ResponseFormatter.created(
    res,
    { user: safeUserData },
    "User registered successfully"
  );
});

/**
 * Login user
 */
const loginUser = asyncWrapper(async (req, res, next) => {
  const loginData = {
    email: req.body.email,
    password: req.body.password
  };

  // Delegate to service layer
  const user = await userService.loginUser(loginData);

  // Get safe user data
  const safeUserData = userService.getSafeUserData(user);

  // Return response
  return ResponseFormatter.success(
    res,
    httpStatusCodes.OK,
    { user: safeUserData },
    "User logged in successfully"
  );
});

/**
 * Get all users
 */
const getUsers = asyncWrapper(async (req, res, next) => {
  // Delegate to service layer
  const users = await userService.getAllUsers();

  // Return response
  return ResponseFormatter.success(
    res,
    httpStatusCodes.OK,
    { users },
    "Users retrieved successfully"
  );
});

/**
 * Get user by ID
 */
const getUserById = asyncWrapper(async (req, res, next) => {
  const userId = req.params.userId;

  // Delegate to service layer
  const user = await userService.getUserById(userId);

  // Get safe user data (exclude password)
  const safeUserData = userService.getSafeUserData(user);

  // Return response
  return ResponseFormatter.success(
    res,
    httpStatusCodes.OK,
    { user: safeUserData },
    "User retrieved successfully"
  );
});

/**
 * Update user profile
 */
const updateUserProfile = asyncWrapper(async (req, res, next) => {
  const userId = req.currentUser.id; // From auth middleware
  const updateData = req.body;

  // Delegate to service layer
  const updatedUser = await userService.updateUserProfile(userId, updateData);

  // Get safe user data
  const safeUserData = userService.getSafeUserData(updatedUser);

  // Return response
  return ResponseFormatter.updated(
    res,
    { user: safeUserData },
    "User profile updated successfully"
  );
});

module.exports = {
  registerUser,
  loginUser,
  getUsers,
  getUserById,
  updateUserProfile
};

