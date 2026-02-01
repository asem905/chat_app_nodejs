const jwt = require('jsonwebtoken');
require('dotenv').config();
const generateJWT = (payload) => {
    return jwt.sign(payload, process.env.SERVER_SECRET_KEY, { expiresIn: '3d' });
}
module.exports = generateJWT;