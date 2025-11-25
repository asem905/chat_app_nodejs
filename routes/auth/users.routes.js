const express = require('express');
const router = express.Router();

// --- Module Imports ---
// CRITICAL FIX: Destructure the rules and the validate middleware
const { registerUserRules, validate } = require('../../middlewares/validn_schema'); 
const usersController = require('../../controller/users/users.controller');
const upload = require('../../configs/multer.config'); 
const verifyToken = require('../../middlewares/verify_token');

router.get('/', verifyToken, usersController.getUsers); 

router.post('/register', 
    upload.single('avatar'), 
    registerUserRules(), 
    validate,           
    usersController.registerUser
);
router.post('/login', usersController.loginUser);

module.exports = router;