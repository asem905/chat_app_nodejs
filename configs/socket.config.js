const http = require('http');
const { Server } = require('socket.io');
const app = require('../app');
const verifyToken = require('../middlewares/verify_token');

// 1. Create the HTTP server using your Express app
const server = http.createServer(app);

// 2. Initialize Socket.IO Server
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// --- Socket.IO Event Handling placeholder ---
let sendMessageHandler = (socket, data, callback) => {  // ✅ Add callback parameter
    console.log('[Socket] Message received, handler not yet assigned.');
};
io.use((socket, next) => {
    // Client sends auth data via the 'auth' object in setAuth({...})
    const token = socket.handshake.auth.token || socket.handshake.auth.Authorization;
    console.log(socket);
    if (token) {
        // You would typically verify the JWT here.
        // For debugging, simply log that the token was received.
        console.log(`[Socket Auth] Received token for client ${socket.id}`);
        // If authentication passes, proceed with the connection
        next(); 
    } else {
        // Reject connection if token is missing (or validation fails)
        console.log(`[Socket Auth] Connection rejected: No token provided.`);
        const error = new Error("Authentication error: Token required.");
        error.data = { message: "Invalid token or missing credentials" };
        next(error);
    }
});
io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // 1. JOIN A ROOM
    socket.on('joinRoom', (roomId, callback) => {
        socket.join(roomId);
        console.log(`[Socket] ${socket.id} joined room: ${roomId}`);
        
        if (callback) {
            callback({ status: 'ok', message: `Joined room ${roomId}` });
        }
    });

    // 2. LISTEN FOR NEW MESSAGES
    socket.on('sendMessage', (data, callback) => {  // ✅ CHANGED: Add callback
        sendMessageHandler(socket, data, callback);  // ✅ CHANGED: Pass callback
    });

    // 3. DISCONNECT
    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

// Export the HTTP server, the IO instance, and the function to set the handler
module.exports = { 
    server, 
    io,
    setSendMessageHandler: (handler) => { sendMessageHandler = handler; }
};