const appError = require('../utils/app_error');
const { httpStatusCodes, httpStatusText } = require("../utils/http_status");

const isAllowed = (role) => {
    return (req, res, next) => {
        if (req.currentUser.role === role) {
            next();
        } else {
            const error = appError.createErrorResponse(
                "You are not allowed to access this route",
                httpStatusCodes.FORBIDDEN,
                httpStatusText.FAIL
            );
            next(error);
        }
    }
}

module.exports = isAllowed;
