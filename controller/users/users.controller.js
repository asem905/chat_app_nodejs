const { User, UserRoom } = require("../../models/relations/users_rooms_link");
const bcrypt = require("bcrypt");
const generateJWT = require("../../utils/genJWT");
const asyncWrapper = require("../../middlewares/async_wrapper");
const { validationResult } = require("express-validator");
const appError = require("../../utils/app_error");
const { httpStatusText, httpStatusCodes } = require("../../utils/http_status");
const roomRules = require("../../utils/room_rules");
// Function to safely extract user data for response
const getUserResponseData = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  status: user.status,
  role: user.role,
  token: user.token,
});

// Register a new user
const registerUser = asyncWrapper(async (req, res, next) => {
  // Validate request body (UNCOMMENTED AND CORRECTED)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Using the global error handler via next() for validation failure
    const validationError = appError.createErrorResponse(
      "Validation Error",
      httpStatusCodes.BAD_REQUEST,
      httpStatusText.FAIL,
      errors.array()
    );
    return next(validationError);
  } // Multer uses req.file.filename, not req.file.fileName
  const avatar = req.file ? req.file.filename : "";

  const { username, email, password, role } = req.body; // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    // FIX: Use 'return' and proper status codes/structure
    return res
      .status(httpStatusCodes.BAD_REQUEST)
      .json({ status: httpStatusText.FAIL, message: "User already exists" });
  } // Hash the password

  const hashedPassword = await bcrypt.hash(password, 10); // Create a new user (ID is generated here)
  if (!hashedPassword) {
    return res
      .status(httpStatusCodes.BAD_REQUEST)
      .json({
        status: httpStatusText.FAIL,
        message: "Password hashing failed",
      });
  }
  const userData = {
    username: username,
    email: email,
    password: hashedPassword,
    role: role,
    token: null,
  };
  if (avatar) {
    userData.avatar = avatar;
  }
  const user = await User.create({
    ...userData,
  }); // Generate JWT token using the new user's ID

  const token = generateJWT({
    id: user.id,
    email: user.email,
    role: user.role,
  }); // Update the user record with the generated token

  user.token = token;
  await user.save(); // Send response // FIX: Added 'return' for successful response termination

  return res.status(httpStatusCodes.CREATED).json({
    status: httpStatusText.SUCCESS,
    data: {
      user: getUserResponseData(user),
    },
  });
});

// Login user
const loginUser = asyncWrapper(async (req, res) => {
  const { email, password } = req.body; // Check if user exists
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(httpStatusCodes.UNAUTHORIZED).json({
      status: httpStatusText.FAIL,
      message: "Please enter valid password and email",
    });
  } // Check if password is correct
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res
      .status(httpStatusCodes.UNAUTHORIZED)
      .json({ status: httpStatusText.FAIL, message: "Invalid password" });
  } // Generate JWT token
  const token = generateJWT({
    id: user.id,
    email: user.email,
    role: user.role,
  });
  // Update user token in DB and save
  user.token = token;
  await user.save(); // Send response // FIX: Added 'return' for successful response termination

  return res.status(httpStatusCodes.OK).json({
    status: httpStatusText.SUCCESS,
    message: "User logged in successfully",
    data:{
      user: getUserResponseData(user)
    }
  });
});

const getUsers = asyncWrapper(async (_req, res) => {
  // Exclude sensitive fields like password and token when fetching all users
  const users = await User.findAll({
    attributes: { exclude: ["password", "token"] },
  });
  if (!users || users.length === 0) {
    // Using return next(error) is generally cleaner for NOT_FOUND/ERROR states
    const error = appError.createErrorResponse(
      "Users not found",
      httpStatusCodes.NOT_FOUND,
      httpStatusText.FAIL
    );
    return res.json({ ...error });
  }

  return res
    .status(httpStatusCodes.OK)
    .json({ status: httpStatusText.SUCCESS, data: { users } });
});


module.exports = {
  registerUser,
  loginUser,
  getUsers
};
