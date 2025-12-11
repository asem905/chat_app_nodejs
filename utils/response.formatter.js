const { httpStatusText } = require("../utils/http_status");

/**
 * Response Formatter Utility
 * Ensures consistent response structure across the application
 */
class ResponseFormatter {
    static success(res, statusCode, data, message = null) {
        const response = {
            status: httpStatusText.SUCCESS,
            data
        };
        if (message) {
            response.message = message;
        }

        return res.status(statusCode).json(response);
    }

    static error(res, statusCode, message, errors = null) {
        const response = {
            status: httpStatusText.FAIL,
            message
        };

        if (errors) {
            response.errors = errors;
        }

        return res.status(statusCode).json(response);
    }

    static paginated(res, statusCode, data, pagination) {
        return res.status(statusCode).json({
            status: httpStatusText.SUCCESS,
            data,
            pagination: {
                limit: pagination.limit,
                offset: pagination.offset,
                total: pagination.total,
                hasMore: pagination.hasMore
            }
        });
    }

    static created(res, data, message = "Resource created successfully") {
        return this.success(res, 201, data, message);
    }

    static deleted(res, message = "Resource deleted successfully") {
        return this.success(res, 200, null, message);
    }

    static updated(res, data, message = "Resource updated successfully") {
        return this.success(res, 200, data, message);
    }

    static error(res, statusCode, message, errors = null) {
        const response = {
            status: httpStatusText.FAIL,
            message
        };

        if (errors) {
            response.errors = errors;
        }

        return res.status(statusCode).json(response);
    }

    static paginated(res, statusCode, data, pagination) {
        return res.status(statusCode).json({
            status: httpStatusText.SUCCESS,
            data,
            pagination: {
                limit: pagination.limit,
                offset: pagination.offset,
                total: pagination.total,
                hasMore: pagination.hasMore
            }
        });
    }

    static created(res, data, message = "Resource created successfully") {
        return this.success(res, 201, data, message);
    }


    static deleted(res, message = "Resource deleted successfully") {
        return this.success(res, 200, null, message);
    }

    static updated(res, data, message = "Resource updated successfully") {
        return this.success(res, 200, data, message);
    }
}

module.exports = ResponseFormatter;
