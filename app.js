// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { httpStatusCodes, httpStatusText } = require('./utils/http_status');
const { detectSQLInjection } = require('./middlewares/sanitization');
const { globalLimiter, speedLimiter } = require('./middlewares/rate_limiter');
const app = new express();
const usersRoutes = require('./routes/auth/users.routes');
const roomsRoutes = require('./routes/chat/rooms.routes');
const dotenv = require('dotenv');
dotenv.config();
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS.split(',');
// Security Middleware (applied first)
app.use(helmet());
app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
}));

// Body parsing middleware
app.use(express.json());

// Sanitization middleware (after body parsing, before routes)
app.use(detectSQLInjection); // Detect SQL injection patterns

// Rate limiting middleware
app.use(globalLimiter); // Global rate limiter
app.use(speedLimiter); // Speed limiter (slows down excessive requests)
// RouteS
const path = require("path");
app.use('/api/v1/uploads', express.static(path.join(__dirname, './uploads')));
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/rooms', roomsRoutes);
// Additional middleware and route setups can be added here

app.use((err, req, res, next) => {
    console.log(err.statusCode);
    console.log(err.statusText);
    console.log(err.message);
    if (!res.headersSent) {
        return res.status(err.statusCode || httpStatusCodes.SERVER_ERROR).json({ status: err.statusText || httpStatusText.ERROR, message: err.message || 'Internal Server Error' });
    }
});
app.all(/.*/, (req, res) => {
    if (!res.headersSent) {
        return res.status(httpStatusCodes.NOT_FOUND).json({ status: httpStatusText.ERROR, message: 'Route not found' });
    }
});
// Export the singleton instance
module.exports = app;