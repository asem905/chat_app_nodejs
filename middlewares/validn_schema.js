const { body, validationResult } = require("express-validator");
const { httpStatusCodes, httpStatusText } = require("../utils/http_status");
const validator = require('validator');

// Blacklisted usernames
const USERNAME_BLACKLIST = [
    'admin',
    'administrator',
    'system',
    'moderator',
    'mod',
    'owner',
    'root',
    'support',
    'help',
    'service',
    'null',
    'undefined',
];

/**
 * Enhanced registration validation rules
 */
const registerUserRules = () => {
    const minPasswordLength = parseInt(process.env.MIN_PASSWORD_LENGTH) || 8;
    const requireStrongPassword = process.env.REQUIRE_STRONG_PASSWORD === 'true';

    return [
        body('username')
            .trim()
            .isLength({ min: 3, max: 30 })
            .withMessage('Username must be between 3 and 30 characters')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username can only contain letters, numbers, and underscores')
            .custom((value) => {
                const lowerValue = value.toLowerCase();
                if (USERNAME_BLACKLIST.includes(lowerValue)) {
                    throw new Error('This username is reserved and cannot be used');
                }
                return true;
            }),

        body('email')
            .trim()
            .isEmail()
            .withMessage('Invalid email format')
            .normalizeEmail()
            .isLength({ max: 255 })
            .withMessage('Email is too long')
            .custom((value) => {
                // Additional email validation
                const domain = value.split('@')[1];
                if (domain && domain.includes('..')) {
                    throw new Error('Invalid email domain');
                }
                return true;
            }),

        body('password')
            .isLength({ min: minPasswordLength })
            .withMessage(`Password must be at least ${minPasswordLength} characters long`)
            .custom((value) => {
                if (requireStrongPassword) {
                    // Check for uppercase letter
                    if (!/[A-Z]/.test(value)) {
                        throw new Error('Password must contain at least one uppercase letter');
                    }
                    // Check for lowercase letter
                    if (!/[a-z]/.test(value)) {
                        throw new Error('Password must contain at least one lowercase letter');
                    }
                    // Check for number
                    if (!/[0-9]/.test(value)) {
                        throw new Error('Password must contain at least one number');
                    }
                }
                return true;
            })
            .custom((value) => {
                // Check for common weak passwords
                const weakPasswords = ['password', '12345678', 'qwerty123', 'abc12345'];
                if (weakPasswords.includes(value.toLowerCase())) {
                    throw new Error('This password is too common. Please choose a stronger password');
                }
                return true;
            }),

        body('confirmPassword')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Passwords do not match');
                }
                return true;
            }),
    ];
};

/**
 * Login validation rules
 */
const loginUserRules = () => {
    console.log("loginUserRules");
    return [
        body('email')
            .trim()
            .isEmail()
            .withMessage('Invalid email format')
            .normalizeEmail(),

        body('password')
            .notEmpty()
            .withMessage('Password is required'),
    ];
};

/**
 * Room creation validation rules
 */
const roomCreationRules = () => {
    return [
        body("room_name")
            .trim()
            .isLength({ min: 3, max: 100 })
            .withMessage("Room name must be between 3 and 100 characters"),

        body("room_description")
            .trim()
            .isLength({ min: 3, max: 500 })
            .withMessage("Room description must be between 3 and 500 characters"),

        body("is_private")
            .isBoolean({ strict: true })
            .withMessage("is_private must be a boolean (true or false)"),
    ];
};

/**
 * Middleware to process and handle validation errors
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
        return res
            .status(httpStatusCodes.BAD_REQUEST)
            .json({
                status: httpStatusText.FAIL,
                message: errors.array()
            });
    }

    next();
};

module.exports = {
    registerUserRules,
    loginUserRules,
    roomCreationRules,
    validate,
    USERNAME_BLACKLIST,
};