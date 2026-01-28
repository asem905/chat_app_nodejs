const express = require('express');
const router = express.Router();

// --- Module Imports ---
const { validate, registerUserRules, loginUserRules } = require('../../middlewares/validn_schema');
const { sanitizeUserData } = require('../../middlewares/sanitization');
const { authLimiter } = require('../../middlewares/rate_limiter');
const usersController = require('../../controller/users/users.controller');
const upload = require('../../configs/multer.config');
const verifyToken = require('../../middlewares/verify_token');

router.get('/', verifyToken, usersController.getUsers);

router.post('/register',
    authLimiter,  // Rate limit registration attempts
    upload.single('avatar'),
    sanitizeUserData,  // Sanitize input
    registerUserRules(),  // Enhanced validation (now in validn_schema.js)
    validate,
    usersController.registerUser
);

router.post('/login',
    authLimiter,  // Rate limit login attempts
    loginUserRules(),  // Add login validation
    validate,
    usersController.loginUser
);

module.exports = router;