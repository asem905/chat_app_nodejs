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
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
dotenv.config();
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS.split(',');
// Swagger Setup
const options = {
    definition: {

        info: {
            title: "Chat App API",
            version: "1.0.0",
            description: "Chat App API documentation",
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 9595}`,
                description: "Development server",
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                User: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            description: "User ID",
                        },
                        username: {
                            type: "string",
                            description: "Username",
                        },
                        email: {
                            type: "string",
                            format: "email",
                            description: "User email",
                        },
                        password: {
                            type: "string",
                            format: "password",
                            description: "User password (only for registration/login)",
                        },
                        avatar: {
                            type: "string",
                            description: "Avatar URL",
                            default: "profile.png",
                        },
                        status: {
                            type: "string",
                            enum: ["online", "busy", "offline"],
                            description: "User status",
                            default: "online",
                        },
                        role: {
                            type: "string",
                            enum: ["user", "admin"],
                            description: "User role",
                            default: "user",
                        },
                        last_seen: {
                            type: "string",
                            format: "date-time",
                            description: "Last seen timestamp",
                        },
                        token: {
                            type: "string",
                            description: "JWT token",
                        },
                    },
                },
                Room: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            description: "Room ID",
                        },
                        room_name: {
                            type: "string",
                            description: "Room name",
                        },
                        room_description: {
                            type: "string",
                            description: "Room description",
                        },
                        is_private: {
                            type: "boolean",
                            description: "Whether the room is private",
                        },
                        room_created_by: {
                            type: "integer",
                            description: "ID of the user who created the room",
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                            description: "Room creation timestamp",
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                            description: "Room last update timestamp",
                        },
                    },
                },
                Message: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            description: "Message ID",
                        },
                        room_id: {
                            type: "integer",
                            description: "Room ID",
                        },
                        user_id: {
                            type: "integer",
                            description: "User ID",
                        },
                        content: {
                            type: "string",
                            description: "Message content",
                        },
                        created_at: {
                            type: "string",
                            format: "date-time",
                            description: "Message creation timestamp",
                        },
                        edited_at: {
                            type: "string",
                            format: "date-time",
                            description: "Message edit timestamp",
                            nullable: true,
                        },
                        deleted_at: {
                            type: "string",
                            format: "date-time",
                            description: "Message deletion timestamp",
                            nullable: true,
                        },
                        parent_message_id: {
                            type: "integer",
                            description: "Parent message ID for replies",
                            nullable: true,
                        },
                    },
                },
            },
        },
    },
    apis: ["./routes/**/*.routes.js"],
};
const swaggerSpec = swaggerJsDoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
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