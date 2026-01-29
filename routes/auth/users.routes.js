const express = require('express');
const router = express.Router();

// --- Module Imports ---
const { validate, registerUserRules, loginUserRules } = require('../../middlewares/validn_schema');
const { sanitizeUserData } = require('../../middlewares/sanitization');
const { authLimiter } = require('../../middlewares/rate_limiter');
const usersController = require('../../controller/users/users.controller');
const upload = require('../../configs/multer.config');
const verifyToken = require('../../middlewares/verify_token');
// Swagger
/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get('/', verifyToken, usersController.getUsers);

/**
 * @swagger
 * /api/v1/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     parameters:
 *       - in: formData
 *         name: username
 *         required: true   
 *         schema:
 *           $ref: '#/components/schemas/User'
 *       - in: formData
 *         name: email
 *         required: true   
 *         schema:
 *           $ref: '#/components/schemas/User'
 *       - in: formData
 *         name: password
 *         required: true   
 *         schema:
 *           $ref: '#/components/schemas/User'
 *       - in: formData
 *         name: avatar
 *         required: false   
 *         schema:
 *           $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post('/register',
    authLimiter,  // Rate limit registration attempts
    upload.single('avatar'),
    sanitizeUserData,  // Sanitize input
    registerUserRules(),  // Enhanced validation (now in validn_schema.js)
    validate,
    usersController.registerUser
);

/**
 * @swagger
 * /api/v1/users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           format: Bearer
 *       - in: formData
 *         name: username
 *         required: true   
 *         schema:
 *           $ref: '#/components/schemas/User'
 *       - in: formData
 *         name: password
 *         required: true   
 *         schema:
 *           $ref: '#/components/schemas/User'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post('/login',
    authLimiter,  // Rate limit login attempts
    loginUserRules(),  // Add login validation
    validate,
    usersController.loginUser
);

module.exports = router;