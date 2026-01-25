const { httpStatusCodes, httpStatusText } = require("../utils/http_status");
const jwt = require("jsonwebtoken");
const appError = require("../utils/app_error");
require("dotenv").config({ path: ".env" });
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  console.log("Auth Header:", authHeader," Req URL:", req.originalUrl);
  if (!authHeader) {
    const error = appError.createErrorResponse(
      "Access denied. No token provided.",
      httpStatusCodes.UNAUTHORIZED,
      httpStatusText.FAIL
    );
    return next(error);
  }
  const token = authHeader.split(" ")[1].toString();
  console.log("==============================+", token);
  jwt.verify(token, process.env.SERVER_SECRET_KEY, (err, user) => {
    if (err) {
      const error = appError.createErrorResponse(
        "Invalid or expired token.",
        httpStatusCodes.UNAUTHORIZED,
        httpStatusText.FAIL
      );
      return next(error);
    }
    req.currentUser = user;
    // console.log("from verify:",req.currentUser);
    return next();
  });
  
};
module.exports = verifyToken;
