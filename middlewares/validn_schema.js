const { body, validationResult } = require("express-validator");
const { httpStatusCodes, httpStatusText } = require("../utils/http_status"); // Assuming these are available

/**
 * 1. Defines the validation rules for User Registration.
 */
const registerUserRules = () => {
    return [
        body("username")
            .trim()
            .isLength({ min: 3 })
            .withMessage("Username must be at least 3 characters long"),
        
        body("email")
            .isEmail()
            .withMessage("Invalid email format"),
        
        body("password")
            .isLength({ min: 6 })
            .withMessage("Password must be at least 6 characters long"),
        
        body("confirmPassword").custom((value, { req }) => {
            if (value !== req.body.password) {
                // NOTE: This error message will be visible to the user
                throw new Error("Passwords do not match"); 
            }
            return true;
        }),
    ];
};

/**
 * 2. Defines the validation rules for Room Creation.
 */
const roomCreationRules = () => {
    return [
        body("room_name")
            .trim()
            .isLength({ min: 3 })
            .withMessage("Room name must be at least 3 characters long"),
        
        body("room_description")
            .trim()
            .isLength({ min: 3 })
            .withMessage("Room description must be at least 3 characters long"),
        
        body("is_private")
            // Converts input to boolean before validation
            .isBoolean({ strict: true }) 
            .withMessage("is_private must be a boolean (true or false)"),
            
    ];
};
/**
 * 3. Middleware to process and handle validation errors.
 * This runs after the rules defined above.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    
    // If errors were found (validation failed)
    if (!errors.isEmpty()) {
        // Send a 400 Bad Request response with the error details
        return res
            .status(httpStatusCodes.BAD_REQUEST)
            .json({ 
                status: httpStatusText.FAIL, 
                message: errors.array() 
            });
    }

    // If no errors, continue to the next middleware/controller
    next();
};


module.exports = {
    // Export the rules sets
    registerUserRules,
    roomCreationRules,
    
    // Export the handler function
    validate,
};